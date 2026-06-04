import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const localSessions: unknown[] = [];

export async function GET() {
  return NextResponse.json({ ok: true, sessions: localSessions });
}

export async function POST(req: NextRequest) {
  let body: {
    studentId?: string;
    coachId?: string;
    track?: "placement" | "exam";
    topic?: string;
    scheduledFor?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.studentId || !body.coachId || !body.track || !body.topic) {
    return NextResponse.json(
      { ok: false, error: "studentId, coachId, track, and topic are required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    session: {
      id: `sess_${body.studentId}_${Math.random().toString(36).slice(2, 8)}`,
      studentId: body.studentId,
      coachId: body.coachId,
      track: body.track,
      topic: body.topic,
      status: "scheduled",
      scheduledFor: body.scheduledFor || null,
      privacy:
        body.track === "exam"
          ? "exam risk indicators remain restricted to candidate, counsellor, and exam institute"
          : "placement development insights visible to authorized placement stakeholders",
    },
  });
}
