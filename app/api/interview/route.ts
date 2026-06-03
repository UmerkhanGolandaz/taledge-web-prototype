import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TranscriptMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

async function analyzeResume(body: any, apiKey: string) {
  const { pdfBase64, targetRole } = body;

  if (!pdfBase64) {
    return NextResponse.json({ ok: false, error: "PDF required" }, { status: 400 });
  }

  const prompt = `You are an expert resume analyst. Extract and analyze this resume for a ${targetRole} position.

Return EXACTLY this JSON format (no markdown, no explanation):
{
  "resumeText": "Full extracted text from resume (max 2000 chars)",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": "Brief summary of experience",
  "projects": ["project1", "project2"]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
          ]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.3,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 }
        },
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ ok: false, error: `Gemini error: ${response.status}` }, { status: 502 });
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to parse resume analysis" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    resumeText: parsed.resumeText || "",
    skills: parsed.skills || [],
    experience: parsed.experience || "",
    projects: parsed.projects || [],
  });
}

async function generateQuestion(body: any, apiKey: string) {
  const { candidateName, targetRole, experienceLevel, resumeText, skills, previousAnswers, questionCount } = body;

  const qNum = questionCount + 1;

  const prompt = `You are an AI interviewer conducting a technical interview.

Candidate: ${candidateName}
Target Role: ${targetRole}
Experience: ${experienceLevel}
Skills: ${skills?.join(", ") || "Not specified"}
Resume: ${resumeText?.slice(0, 1000) || "Not available"}

${previousAnswers?.length > 0 ? `Previous answers:\n${previousAnswers.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")}` : ""}

This is question ${qNum} of 8.

Generate ONE specific, personalized question for this candidate.

Rules:
- Build on their previous answers
- Match their experience level
- Be conversational, not robotic
- Keep to 1-2 sentences
- Focus on ${targetRole} role requirements

Return ONLY the question text, nothing else.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.8,
          thinkingConfig: { thinkingBudget: 0 }
        },
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ ok: false, error: "Failed to generate question" }, { status: 502 });
  }

  const data = await response.json();
  const question: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!question) {
    return NextResponse.json({ ok: false, error: "Empty question" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, question });
}

async function generateReport(body: any, apiKey: string) {
  const { candidateName, targetRole, transcript, resumeText, skills } = body;

  const answers = transcript?.filter((m: TranscriptMessage) => m.role === "user").map((m: TranscriptMessage) => m.content) || [];

  const prompt = `Generate a detailed interview report for this candidate.

Candidate: ${candidateName}
Target Role: ${targetRole}
Skills: ${skills?.join(", ") || "Not specified"}
Resume: ${resumeText?.slice(0, 500) || "Not available"}

Interview Answers:
${answers.map((a: string, i: number) => `Q${i + 1}: ${a}`).join("\n")}

Generate a comprehensive report in this JSON format:
{
  "overallScore": 75,
  "technicalScore": 70,
  "communicationScore": 80,
  "problemSolvingScore": 75,
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "recommendation": "Hire / Consider / Reject",
  "summary": "2-3 sentence summary",
  "detailedFeedback": "Detailed paragraph feedback"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.5,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 }
        },
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ ok: false, error: "Failed to generate report" }, { status: 502 });
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let report;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      report = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    report = {
      overallScore: 70,
      technicalScore: 70,
      communicationScore: 70,
      problemSolvingScore: 70,
      strengths: ["Good communication"],
      areasForImprovement: ["More details needed"],
      recommendation: "Consider",
      summary: "Interview completed.",
      detailedFeedback: "Report generation failed, please review transcript manually."
    };
  }

  return NextResponse.json({
    ok: true,
    report: {
      ...report,
      candidateName,
      targetRole,
      skills,
      answers,
      generatedAt: Date.now(),
    }
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "analyzeResume":
        return await analyzeResume(body, apiKey);
      case "generateQuestion":
        return await generateQuestion(body, apiKey);
      case "generateReport":
        return await generateReport(body, apiKey);
      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}