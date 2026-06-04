import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type PublishBody = {
  studentId?: string;
  reportType?: "fit-score" | "dnla" | "combined";
  audience?: "recruiters" | "institute" | "private";
  consent?: boolean;
};

export async function POST(req: NextRequest) {
  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.studentId) {
    return NextResponse.json({ ok: false, error: "studentId is required" }, { status: 400 });
  }

  if (!body.consent) {
    return NextResponse.json(
      { ok: false, error: "Candidate consent is required before publishing" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "published",
    studentId: body.studentId,
    reportType: body.reportType || "combined",
    audience: body.audience || "recruiters",
    publishedAt: Date.now(),
    shareId: `share_${body.studentId}_${Math.random().toString(36).slice(2, 8)}`,
  });
}
