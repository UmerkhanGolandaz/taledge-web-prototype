import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 90;

type Msg = { role: "assistant" | "user"; content: string };

type DnlaItem = {
  competency: string;
  group: string;
  score: number;
  benchmark: number;
  insight: string;
};

type Body = {
  studentId: string;
  candidateName: string;
  targetRole: string;
  resumeSummary?: string;
  resumeSkills?: string[];
  resumeProjects?: { title: string; stack: string[]; impact: string }[];
  technicalQA: Msg[];
  behaviouralQA: Msg[];
  dnla?: DnlaItem[];
  dnlaStrengths?: string[];
  dnlaDevelopmentAreas?: string[];
  dnlaRisks?: string[];
};

function demoGenerated(body: Body) {
  return {
    technical_score: 74,
    behavioural_score: 71,
    fit_score: 73,
    success_probability: 76,
    verdict: "Promising fit with focused growth areas",
    narrative: `${body.candidateName || "The candidate"} demonstrates relevant experience for ${body.targetRole || "the target role"} and communicates a practical approach to problem solving. Resume evidence and interview responses show a credible foundation, with deeper system design validation recommended. The next development focus should be structured technical depth and clearer articulation of trade-offs.`,
    technical_breakdown: [
      { group: "Problem-solving depth", rows: [["Solution correctness", 76], ["Approach structure", 74], ["Trade-off analysis", 68]] },
      { group: "Thinking quality", rows: [["Reasoning clarity", 78], ["Conceptual correctness", 73], ["Error recovery", 70]] },
      { group: "Coding", rows: [["Code correctness", 72], ["Code readability", 76], ["Edge-case awareness", 69]] },
    ],
    resume_breakdown: [
      { group: "Skill matching", rows: [["Skill match score (vs JD)", 79], ["Core skill percentage", 76]] },
      { group: "Project quality", rows: [["Project relevance", 77], ["Project impact", 72]] },
    ],
    behavioural_breakdown: [
      { group: "Communication", rows: [["Communication clarity", 74], ["Structured answers", 69]] },
      { group: "Ownership & attitude", rows: [["Ownership score", 75], ["Accountability", 73]] },
    ],
    cross_flags: [
      { label: "Tech vs Resume gap", verdict: "Resume claims are broadly supported by interview evidence.", tone: "ok" },
      { label: "Confidence vs Accuracy gap", verdict: "Confidence is mostly calibrated; validate depth with one extended coding round.", tone: "warn" },
      { label: "Role readiness", verdict: "Candidate is suitable for a structured next-stage interview.", tone: "ok" },
    ],
  };
}

function transcriptToText(msgs: Msg[] | undefined): string {
  if (!msgs || msgs.length === 0) return "(no responses)";
  return msgs
    .map(
      (m, i) =>
        `${m.role === "assistant" ? "Q" : "A"}${Math.floor(i / 2) + 1}: ${m.content}`
    )
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

function clamp(n: any, min = 0, max = 100): number {
  const v = Number(n);
  if (!isFinite(v)) return Math.round((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(v)));
}

const RUBRIC = {
  technical: {
    "Accuracy & Coverage": ["Tech accuracy score", "Difficulty-weighted accuracy"],
    "Problem-solving depth": ["Solution correctness", "Approach structure", "Multi-approach capability"],
    "Thinking quality": ["Reasoning clarity", "Conceptual correctness", "Error recovery"],
    "Coding": ["Code correctness", "Code efficiency", "Code readability"],
    "Behavioural signals during tech": ["Response latency", "Latency variance", "Hint dependency (lower = better)", "Consistency"],
  },
  resume: {
    "Skill matching": ["Skill match score (vs JD)", "Core skill percentage"],
    "Project quality": ["Project relevance", "Project complexity", "Project impact"],
    "Academic signals": ["Academic consistency", "Education tier"],
    "Resume quality": ["Resume clarity", "Resume specificity"],
  },
  behavioural: {
    "Communication": ["Communication clarity", "Structured answer (STAR)", "Verbosity (calibrated)"],
    "Content quality": ["Relevance to question", "Specificity (vs general)", "Impact orientation"],
    "Ownership & attitude": ["Ownership score", "Blame vs accountability"],
    "Consistency": ["Resume alignment", "Internal consistency"],
    "Cultural fit indicators": ["Collaboration signal", "Initiative score", "Ethical alignment"],
  },
} as const;

function rubricToPromptList(rubric: Record<string, readonly string[]>): string {
  return Object.entries(rubric)
    .map(([group, items]) => `  - ${group}: [${items.map((i) => `"${i}"`).join(", ")}]`)
    .join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const techCount = body.technicalQA?.filter((m) => m.role === "user").length || 0;
  const behavCount = body.behaviouralQA?.filter((m) => m.role === "user").length || 0;
  if (techCount + behavCount === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No interview responses found. Complete at least one answer in the Technical or Behavioural interview to generate your Fit Score report.",
      },
      { status: 422 }
    );
  }
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      generated: demoGenerated(body),
      source: "demo-fallback-no-key",
      meta: { techCount, behavCount, hasDnla: (body.dnla?.length || 0) > 0 },
    });
  }

  const dnlaSummary = (body.dnla || [])
    .map((d) => `${d.group} · ${d.competency}: ${d.score.toFixed(1)} / 7 (benchmark ${d.benchmark.toFixed(1)})`)
    .join("\n");

  const skillList = (body.resumeSkills || []).join(", ");
  const projectList = (body.resumeProjects || [])
    .map((p) => `${p.title} [${p.stack.join(", ")}] · ${p.impact}`)
    .join("\n");

  const prompt = `You are a senior talent intelligence analyst computing a candidate's Fit Score per the Taledge PRD §9 rubric.

You will receive:
- Resume context
- Full DNLA Social Competence report (already scored on 1-7 scale)
- Technical Interview transcript
- Behavioural Interview transcript

Your task is to compute every sub-score (0-100 scale) by grounding it in **specific evidence** from the transcripts and resume. Where evidence is thin or contradictory, score in the 30-55 range and call that out in the verdict. Do not invent capabilities.

Candidate: ${body.candidateName}
Target role: ${body.targetRole}

Resume summary: ${body.resumeSummary || "(not provided)"}
Resume skills: ${skillList || "(not provided)"}
Resume projects:
${projectList || "(not provided)"}

DNLA report:
${dnlaSummary || "(not provided)"}
DNLA strengths: ${(body.dnlaStrengths || []).join("; ") || "(none captured)"}
DNLA development areas: ${(body.dnlaDevelopmentAreas || []).join("; ") || "(none captured)"}
DNLA risks: ${(body.dnlaRisks || []).join("; ") || "(none)"}

Technical Interview transcript:
${transcriptToText(body.technicalQA)}

Behavioural Interview transcript:
${transcriptToText(body.behaviouralQA)}

Sub-score rubric (every numeric must be an integer 0-100):

Component 01 · Technical Interview features:
${rubricToPromptList(RUBRIC.technical)}

Component 02 · Resume & profile features:
${rubricToPromptList(RUBRIC.resume)}

Component 04 · Behavioural Interview features:
${rubricToPromptList(RUBRIC.behavioural)}

Headline scores (also 0-100):
- technical_score: weighted aggregate of Component 01
- behavioural_score: weighted aggregate of Component 03 (DNLA) and Component 04
- fit_score: weighted composite of Components 01-04 for the target role
- success_probability: predicted likelihood of successful placement, 0-100

Cross-component features (Component 05) · each must be { "label": string, "verdict": string, "tone": "ok" | "warn" | "danger" }:
- "Tech vs Resume gap" → are technical answers supported by what the resume claims?
- "Confidence vs Accuracy gap" → does the candidate over- or under-claim relative to demonstrated accuracy?
- "Behaviours vs Psychometric alignment" → do behavioural answers align with the DNLA profile?

Return EXACTLY this JSON shape (no markdown fences, no commentary):

{
  "technical_score": <0-100 integer>,
  "behavioural_score": <0-100 integer>,
  "fit_score": <0-100 integer>,
  "success_probability": <0-100 integer>,
  "verdict": "<one short phrase, e.g. 'Interview-ready' / 'Develop further' / 'Strong fit' / 'High potential, needs polish'>",
  "narrative": "<3-sentence executive summary referencing concrete evidence>",
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

Strictly valid JSON. No prose before or after.`;

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error("[fit-score] Gemini failed:", upstream.status, err.slice(0, 200));
      return NextResponse.json({
        ok: true,
        generated: demoGenerated(body),
        source: `demo-fallback-gemini-${upstream.status}`,
        meta: { techCount, behavCount, hasDnla: (body.dnla?.length || 0) > 0 },
      });
    }

    const data = await upstream.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = extractJson(text);
    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          error: "The model didn't return a parseable report.",
          rawPreview: text.slice(0, 300),
        },
        { status: 422 }
      );
    }

    const generated = {
      technical_score: clamp(parsed.technical_score),
      behavioural_score: clamp(parsed.behavioural_score),
      fit_score: clamp(parsed.fit_score),
      success_probability: clamp(parsed.success_probability),
      verdict: String(parsed.verdict || "Awaiting verdict").slice(0, 60),
      narrative: String(parsed.narrative || "").slice(0, 800),
      technical_breakdown: Array.isArray(parsed.technical_breakdown)
        ? parsed.technical_breakdown.map((g: any) => ({
            group: String(g.group || ""),
            rows: Array.isArray(g.rows)
              ? g.rows.map((r: any) => [String(r?.[0] || ""), clamp(r?.[1])])
              : [],
          }))
        : [],
      resume_breakdown: Array.isArray(parsed.resume_breakdown)
        ? parsed.resume_breakdown.map((g: any) => ({
            group: String(g.group || ""),
            rows: Array.isArray(g.rows)
              ? g.rows.map((r: any) => [String(r?.[0] || ""), clamp(r?.[1])])
              : [],
          }))
        : [],
      behavioural_breakdown: Array.isArray(parsed.behavioural_breakdown)
        ? parsed.behavioural_breakdown.map((g: any) => ({
            group: String(g.group || ""),
            rows: Array.isArray(g.rows)
              ? g.rows.map((r: any) => [String(r?.[0] || ""), clamp(r?.[1])])
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
      generated,
      source: "gemini-2.5-flash",
      meta: { techCount, behavCount, hasDnla: (body.dnla?.length || 0) > 0 },
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
