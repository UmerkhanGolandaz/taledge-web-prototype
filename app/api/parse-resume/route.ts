import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Parsed = {
  is_resume?: boolean;
  reason?: string;
  full_name?: string;
  email?: string;
  institution?: string;
  year_cohort?: string;
  target_role?: string;
  summary?: string;
  skills?: string[];
  projects?: { title: string; stack: string[]; impact: string }[];
};

// Used only when no API key is configured (so the demo never breaks in dev).
const demoFallback: Parsed = {
  is_resume: true,
  full_name: "Priya Raghavan",
  email: "priya.r@atherix.edu",
  institution: "Atherix Institute of Tech",
  year_cohort: "Final Year · B.Tech CS",
  target_role: "Full-stack Software Engineer",
  summary:
    "Final-year CS student with strong systems fundamentals. Built two production-grade web apps and contributed to an open-source ML library.",
  skills: ["TypeScript", "React", "Node.js", "Python", "Postgres", "Docker"],
  projects: [
    {
      title: "CampusKart · Hyperlocal commerce",
      stack: ["Next.js", "Postgres", "Stripe"],
      impact: "1,200 MAU across 3 campuses",
    },
    {
      title: "OSS contributor · scikit-onnx",
      stack: ["Python", "ONNX", "Pytest"],
      impact: "7 merged PRs, 1 perf fix (-18% inference)",
    },
  ],
};

function extractJson(text: string): Parsed | null {
  const trimmed = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch {
    /* fall through */
  }

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const filename = file.name;
  const sizeKb = Math.round(file.size / 1024);

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      parsed: demoFallback,
      source: "demo-no-key",
      filename,
      sizeKb,
    });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type || "application/pdf"};base64,${base64}`;

    const prompt = `You are a resume parser. Look at the attached PDF and decide whether it is a candidate's resume / CV.

If the PDF is NOT a resume (e.g. it's an invoice, contract, brochure, syllabus, article, etc.), return EXACTLY this JSON and nothing else:
{ "is_resume": false, "reason": "<one short sentence describing what the document actually is>" }

If the PDF IS a resume, return EXACTLY this JSON shape (no markdown fences, no commentary):
{
  "is_resume": true,
  "full_name": "string (the candidate's name)",
  "email": "string (the email on the resume, or empty string if none)",
  "institution": "string (most recent college/university, or current employer if no school)",
  "year_cohort": "string (e.g., 'Final Year · B.Tech CS' or '2nd Year · MBA'; infer from education section)",
  "target_role": "string (best-guess target role from the resume's headline, objective, or most senior experience)",
  "summary": "string (2-sentence professional summary)",
  "skills": ["array of 6-10 key technical or professional skills"],
  "projects": [
    {
      "title": "string",
      "stack": ["array of technologies or tools used"],
      "impact": "string (one-line measurable outcome)"
    }
  ]
}

Return strictly valid JSON. No prose before or after.`;

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: file.type || "application/pdf",
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.1,
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
          error: "Resume parsing service is unavailable. Please try again.",
          upstreamStatus: upstream.status,
          upstreamError: err.slice(0, 200),
          filename,
          sizeKb,
        },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const parsed = extractJson(text);

    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "We couldn't read this PDF. Please make sure the resume contains selectable text (not a scanned image).",
          filename,
          sizeKb,
        },
        { status: 422 }
      );
    }

    if (parsed.is_resume === false) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.reason ||
            "This PDF doesn't appear to be a resume.",
          notResume: true,
          filename,
          sizeKb,
        },
        { status: 422 }
      );
    }

    // Sanity check: a real resume should have at least name + (institution OR skills)
    if (
      !parsed.full_name ||
      (!parsed.institution && (!parsed.skills || parsed.skills.length === 0))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This PDF doesn't look like a resume · we couldn't extract a name and credentials.",
          notResume: true,
          filename,
          sizeKb,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      parsed,
      source: "gemini-2.5-flash",
      filename,
      sizeKb,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while parsing. Please try again.",
        detail: e?.message?.slice(0, 200),
        filename,
        sizeKb,
      },
      { status: 500 }
    );
  }
}
