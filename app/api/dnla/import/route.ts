import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ImportBody = {
  studentId?: string;
  track?: "placement" | "exam";
  reportId?: string;
  source?: string;
  competencies?: unknown[];
};

export async function POST(req: NextRequest) {
  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.studentId) {
    return NextResponse.json({ ok: false, error: "studentId is required" }, { status: 400 });
  }

  if (!["placement", "exam"].includes(String(body.track))) {
    return NextResponse.json(
      { ok: false, error: "track must be 'placement' or 'exam'" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "queued",
    source: body.source || "dnla-api-pending",
    integration: "provider-contract-pending",
    reportId: body.reportId || `dnla_${body.studentId}_${Date.now()}`,
    studentId: body.studentId,
    track: body.track,
    importedCompetencies: Array.isArray(body.competencies) ? body.competencies.length : 0,
    visibility:
      body.track === "exam"
        ? "candidate-and-exam-institute-only"
        : "candidate-placement-institute-and-authorized-recruiters",
  });
}
