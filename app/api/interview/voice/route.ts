import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session-store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

// Fallback questions for when API is unavailable
const TECHNICAL_QUESTIONS = [
  "Walk me through the most technically challenging project on your resume. What was the architecture, and what was the single hardest decision you made?",
  "You're designing a real-time notification system. How would you approach the architecture for one million daily active users?",
  "Tell me about a time you had to debug a production issue with limited information. What was your approach?",
  "What programming concept do you find most fascinating and why?",
];

const BEHAVIOURAL_QUESTIONS = [
  "Tell me about a time you received feedback you initially disagreed with. What happened, and what would you do differently now?",
  "Describe a moment where you had to push back on a senior teammate. How did you handle it?",
  "Tell me about a time you noticed something was wrong but the rest of the team disagreed. What did you do?",
];

function getFallbackQuestion(mode: "technical" | "behavioural", turnIndex: number): string {
  if (mode === "technical") {
    return TECHNICAL_QUESTIONS[turnIndex % TECHNICAL_QUESTIONS.length];
  }
  return BEHAVIOURAL_QUESTIONS[turnIndex % BEHAVIOURAL_QUESTIONS.length];
}

async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      console.error("[voice] Whisper failed:", response.status);
      return "";
    }

    const data = await response.json();
    return data.text?.trim() || "";
  } catch (e) {
    console.error("[voice] Transcription error:", e);
    return "";
  }
}

async function callGeminiLLM(
  role: string,
  resumeSummary: string | undefined,
  history: { role: "assistant" | "user"; content: string }[],
  transcript: string,
  mode: "technical" | "behavioural",
  turnIndex: number
): Promise<{ question: string; isDone: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { question: getFallbackQuestion(mode, turnIndex), isDone: turnIndex >= 3 };
  }

  const sysPrompt = mode === "technical"
    ? `You are a senior technical interviewer. Ask ONE incisive technical question. Be specific. Max 50 words.`
    : `You are a behavioural interviewer. Ask ONE question about leadership, feedback, or resilience using STAR. Be specific. Max 50 words.`;

  const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `${sysPrompt}\n\nHistory:\n${historyText}\n\nCandidate said: "${transcript}"\n\nAsk the next question.` }]
          }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
        }),
      }
    );

    if (!response.ok) {
      console.error("[voice] Gemini failed:", response.status);
      return { question: getFallbackQuestion(mode, turnIndex), isDone: false };
    }

    const data = await response.json();
    const question = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return { question: question || getFallbackQuestion(mode, turnIndex), isDone: false };
  } catch (e) {
    console.error("[voice] LLM error:", e);
    return { question: getFallbackQuestion(mode, turnIndex), isDone: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let sessionId: string | null = null;
    let transcript = "";
    let audioMimeType = "audio/webm";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      sessionId = formData.get("sessionId") as string | null;
      const audioFile = formData.get("audio") as File | null;

      if (!audioFile || audioFile.size === 0) {
        return NextResponse.json({ error: "No audio provided" }, { status: 400 });
      }

      if (audioFile.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: "Audio too large" }, { status: 413 });
      }

      audioMimeType = audioFile.type || audioMimeType;
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      transcript = await transcribeAudio(buffer, audioMimeType);
    } else {
      const body = await req.json();
      sessionId = body.sessionId;
      transcript = body.text || "";
    }

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Add user response
    session.transcript.push({ timestamp: Date.now(), role: "user", content: transcript });

    // Get history
    const history = session.transcript
      .filter(t => t.role === "user" || t.role === "assistant")
      .map(t => ({ role: t.role as "assistant" | "user", content: t.content }));

    // Get next question from LLM
    const { question: nextQuestion, isDone } = await callGeminiLLM(
      session.role,
      session.resumeSummary,
      history.slice(0, -1), // Exclude current response
      transcript,
      session.mode,
      session.turnIndex
    );

    // Add AI question
    session.transcript.push({ timestamp: Date.now(), role: "assistant", content: nextQuestion });

    // Update session
    updateSession(sessionId, {
      transcript: session.transcript,
      turnIndex: session.turnIndex + 1,
      isDone,
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      transcript,
      nextQuestion,
      isDone,
      turnIndex: session.turnIndex + 1,
    });

  } catch (e: any) {
    console.error("[voice] Error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
