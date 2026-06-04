import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CandidateInvite = {
  name?: string;
  email?: string;
  targetRole?: string;
  experienceBand?: "fresher" | "1-3";
};

type Body = {
  recruiterId?: string;
  jobId?: string;
  paid?: boolean;
  candidates?: CandidateInvite[];
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.recruiterId || !body.jobId) {
    return NextResponse.json(
      { ok: false, error: "recruiterId and jobId are required" },
      { status: 400 }
    );
  }

  if (!body.paid) {
    return NextResponse.json({
      ok: false,
      status: "payment_required",
      error: "Payment confirmation is required before candidate links are sent",
      quoteId: `quote_${body.recruiterId}_${Date.now()}`,
    }, { status: 402 });
  }

  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const validCandidates = candidates.filter((c) => c.email && c.name);

  return NextResponse.json({
    ok: true,
    status: "links_queued",
    recruiterId: body.recruiterId,
    jobId: body.jobId,
    received: candidates.length,
    queued: validCandidates.length,
    inviteBatchId: `batch_${body.jobId}_${Math.random().toString(36).slice(2, 8)}`,
    nextStep: "Candidates receive profile, assessment, and AI interview links.",
  });
}
