import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { sessionId: string };

function transcriptToText(msgs: any[]): string {
  if (!msgs || msgs.length === 0) return "(no responses)";
  return msgs
    .map((m, i) => `${m.role === "assistant" ? "Q" : "A"}${Math.floor(i / 2) + 1}: ${m.content}`)
    .join("\n");
}

function extractJson(text: string): any | null {
  const trimmed = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampScore(n: any, min = 0, max = 100): number {
  const v = Number(n);
  if (!isFinite(v)) return Math.round((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(v)));
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  let body: Body;

  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = getSession(body.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.isDone) {
    return NextResponse.json(
      {
        ok: false,
        error: "Interview is not complete yet. Keep sending audio until isDone=true.",
        isDone: false,
        turnIndex: session.turnIndex,
      },
      { status: 422 }
    );
  }

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      sessionId: session.sessionId,
      generated: {
        technical_score: 72,
        behavioural_score: 68,
        fit_score: 70,
        success_probability: 65,
        verdict: "Strong fit, develop further",
        narrative: "Candidate demonstrates solid foundational skills with room for growth in advanced system design.",
        technical_breakdown: [
          { group: "Accuracy & Coverage", rows: [["Tech accuracy score", 74], ["Difficulty-weighted accuracy", 70]] },
          { group: "Problem-solving depth", rows: [["Solution correctness", 72], ["Approach structure", 75], ["Multi-approach capability", 68]] },
        ],
        resume_breakdown: [
          { group: "Skill matching", rows: [["Skill match score (vs JD)", 70], ["Core skill percentage", 75]] },
        ],
        behavioural_breakdown: [
          { group: "Communication", rows: [["Communication clarity", 72], ["Structured answer (STAR)", 68]] },
        ],
        cross_flags: [
          { label: "Tech vs Resume gap", verdict: "Aligned", tone: "ok" as const },
          { label: "Confidence vs Accuracy gap", verdict: "Slight overconfidence observed", tone: "warn" as const },
        ],
      },
      source: "demo-no-key",
      meta: { turnCount: session.turnIndex, transcriptLength: session.transcript.length },
    });
  }

  const msgs = session.transcript.map((t: any) => ({
    role: t.role as "assistant" | "user",
    content: t.content,
  }));

  const prompt = `You are a senior talent intelligence analyst computing interview results.

Interview session details:
- Candidate role: ${session.role}
- Mode: ${session.mode}
- Resume context: ${session.resumeSummary || "(not provided)"}

Interview transcript:
${transcriptToText(msgs)}

Per-turn rubric scores captured during interview:
${JSON.stringify(session.rubricScores, null, 2)}

Recruiter notes:
${session.recruiterNotes || "(none)"}

Compute the final scores:

Return EXACTLY this JSON shape (no markdown fences, no commentary):

{
  "technical_score": <0-100 integer>,
  "behavioural_score": <0-100 integer>,
  "fit_score": <0-100 integer>,
  "success_probability": <0-100 integer>,
  "verdict": "<one short phrase>",
  "narrative": "<3-sentence executive summary>",
  "technical_breakdown": [
    { "group": "<group>", "rows": [["<sub-score label>", <0-100>], ...] }
  ],
  "resume_breakdown": [
    { "group": "<group>", "rows": [["<sub-score label>", <0-100>], ...] }
  ],
  "behavioural_breakdown": [
    { "group": "<group>", "rows": [["<sub-score label>", <0-100>], ...] }
  ],
  "cross_flags": [
    { "label": "<check>", "verdict": "<one-sentence finding>", "tone": "ok" | "warn" | "danger" }
  ]
}

Strictly valid JSON.`;

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 3000,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text();
      return NextResponse.json(
        { ok: false, error: "Results generation failed.", upstreamStatus: upstream.status, upstreamError: err.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = extractJson(text);

    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "The model didn't return a parseable report.", rawPreview: text.slice(0, 300) },
        { status: 422 }
      );
    }

    const generated = {
      technical_score: clampScore(parsed.technical_score),
      behavioural_score: clampScore(parsed.behavioural_score),
      fit_score: clampScore(parsed.fit_score),
      success_probability: clampScore(parsed.success_probability),
      verdict: String(parsed.verdict || "Awaiting verdict").slice(0, 60),
      narrative: String(parsed.narrative || "").slice(0, 800),
      technical_breakdown: Array.isArray(parsed.technical_breakdown)
        ? parsed.technical_breakdown.map((g: any) => ({
            group: String(g.group || ""),
            rows: Array.isArray(g.rows)
              ? g.rows.map((r: any) => [String(r?.[0] || ""), clampScore(r?.[1])])
              : [],
          }))
        : [],
      resume_breakdown: Array.isArray(parsed.resume_breakdown)
        ? parsed.resume_breakdown.map((g: any) => ({
            group: String(g.group || ""),
            rows: Array.isArray(g.rows)
              ? g.rows.map((r: any) => [String(r?.[0] || ""), clampScore(r?.[1])])
              : [],
          }))
        : [],
      behavioural_breakdown: Array.isArray(parsed.behavioural_breakdown)
        ? parsed.behavioural_breakdown.map((g: any) => ({
            group: String(g.group || ""),
            rows: Array.isArray(g.rows)
              ? g.rows.map((r: any) => [String(r?.[0] || ""), clampScore(r?.[1])])
              : [],
          }))
        : [],
      cross_flags: Array.isArray(parsed.cross_flags)
        ? parsed.cross_flags.slice(0, 4).map((f: any) => ({
            label: String(f.label || ""),
            verdict: String(f.verdict || ""),
            tone: ["ok", "warn", "danger"].includes(f.tone) ? f.tone : "warn",
          }))
        : [],
    };

    return NextResponse.json({
      ok: true,
      sessionId: session.sessionId,
      generated,
      source: "gemini-2.5-flash",
      meta: { turnCount: session.turnIndex, transcriptLength: session.transcript.length },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong while generating results.", detail: e?.message?.slice(0, 200) },
      { status: 500 }
    );
  }
}
