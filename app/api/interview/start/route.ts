import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session-store";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  sessionId?: string;
  studentId: string;
  role: string;
  mode: "technical" | "behavioural";
  resumeSummary?: string;
};

function generateSessionId(): string {
  return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.studentId || !body.role) {
    return NextResponse.json(
      { error: "studentId and role are required" },
      { status: 400 }
    );
  }

  if (!["technical", "behavioural"].includes(body.mode)) {
    return NextResponse.json(
      { error: "mode must be 'technical' or 'behavioural'" },
      { status: 400 }
    );
  }

  const sessionId = body.sessionId || generateSessionId();

  const session = createSession({
    sessionId,
    studentId: body.studentId,
    role: body.role,
    mode: body.mode,
    resumeSummary: body.resumeSummary,
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.sessionId,
    message: "Session created. Send audio to /api/interview/voice",
    mode: session.mode,
  });
}