import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = { role: "assistant" | "user"; content: string };

type SeedDnla = {
  competency: string;
  group: string;
  score: number;
  benchmark: number;
  insight: string;
}[];

type Body = {
  studentId: string;
  candidateName: string;
  targetRole: string;
  resumeSummary?: string;
  technicalQA: Msg[];
  behaviouralQA: Msg[];
  seedDnla: SeedDnla;
};

function transcriptToText(msgs: Msg[] | undefined): string {
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

function clampScore(n: any): number {
  const v = Number(n);
  if (!isFinite(v)) return 4;
  return Math.max(1, Math.min(7, Math.round(v * 10) / 10));
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  if (!body?.seedDnla?.length) {
    return NextResponse.json(
      { ok: false, error: "seedDnla is required" },
      { status: 400 }
    );
  }

  const techCount = body.technicalQA?.filter((m) => m.role === "user").length || 0;
  const behavCount = body.behaviouralQA?.filter((m) => m.role === "user").length || 0;
  if (techCount + behavCount === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No interview responses found. Complete at least one answer in the Technical or Behavioural interview to generate a personalized DNLA report.",
      },
      { status: 422 }
    );
  }

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "GEMINI_API_KEY is not configured on the server.",
    }, { status: 503 });
  }

  const competencyList = body.seedDnla
    .map((c) => `- ${c.group} · ${c.competency} (benchmark for ${body.targetRole}: ${c.benchmark.toFixed(1)})`)
    .join("\n");

  const prompt = `You are a DNLA Social Competence assessor (the licensed German psychometric framework).

You will receive a candidate's resume context and the transcript of their AI-driven Technical and Behavioural interviews. Your job is to ground each DNLA competency score in **actual evidence from their answers**, on the standard DNLA 1-7 scale.

Candidate: ${body.candidateName}
Target role: ${body.targetRole}
Resume summary: ${body.resumeSummary || "(not provided)"}

DNLA competencies to score (with the top-performer benchmark for this role):
${competencyList}

Technical Interview transcript:
${transcriptToText(body.technicalQA)}

Behavioural Interview transcript:
${transcriptToText(body.behaviouralQA)}

Scoring guidelines:
- 1.0–3.4 → Development needed (evidence is weak, contradictory, or missing)
- 3.5–4.9 → Established (evidence shows the competency at a baseline level)
- 5.0–7.0 → Top range (clear, specific, repeated evidence of strength)
- If the candidate gave thin or one-word answers, score the affected competency in the "Development needed" range and reference that in the insight.
- Each insight must be one sentence that cites concrete evidence from the transcripts or notes the absence of evidence.

Return EXACTLY this JSON shape (no markdown fences, no commentary):

{
  "dnla": [
    { "competency": "<exact competency name>", "group": "<exact group name>", "score": <number 1-7, one decimal>, "insight": "<one-sentence evidence-grounded interpretation>" }
    // ... one entry for each of the ${body.seedDnla.length} competencies above, same order
  ],
  "strengths": ["array of 2-4 short strings · concrete strengths shown in the interview"],
  "developmentAreas": ["array of 2-4 short strings · concrete gaps shown in the interview"],
  "risks": ["array of 0-3 short strings · specific behavioural red flags (or empty if none)"],
  "narrative": "string · 2-3 sentence contextual interpretation tying the scores to the target role"
}

Output strictly valid JSON.`;

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
        {
          ok: false,
          error: "Generation service is unavailable. Please try again.",
          upstreamStatus: upstream.status,
          upstreamError: err.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.dnla)) {
      return NextResponse.json(
        {
          ok: false,
          error: "The model didn't return a parseable DNLA report.",
          rawPreview: text.slice(0, 300),
        },
        { status: 422 }
      );
    }

    // Merge generated values into the seed structure so groups and benchmarks stay consistent.
    const generatedMap = new Map<string, { score: number; insight: string }>();
    for (const item of parsed.dnla) {
      if (item?.competency) {
        generatedMap.set(String(item.competency).toLowerCase(), {
          score: clampScore(item.score),
          insight: String(item.insight || "").trim(),
        });
      }
    }
    const dnla = body.seedDnla.map((seed) => {
      const gen = generatedMap.get(seed.competency.toLowerCase());
      return {
        competency: seed.competency,
        group: seed.group,
        score: gen?.score ?? seed.score,
        benchmark: seed.benchmark,
        insight: gen?.insight || seed.insight,
      };
    });

    const generated = {
      dnla,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 6) : [],
      developmentAreas: Array.isArray(parsed.developmentAreas)
        ? parsed.developmentAreas.slice(0, 6)
        : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 4) : [],
      narrative: typeof parsed.narrative === "string" ? parsed.narrative : "",
    };

    return NextResponse.json({
      ok: true,
      generated,
      source: "gemini-2.5-flash",
      meta: {
        techCount,
        behavCount,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while generating the report.",
        detail: e?.message?.slice(0, 200),
      },
      { status: 500 }
    );
  }
}
