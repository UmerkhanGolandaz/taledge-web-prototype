import { NextRequest, NextResponse } from "next/server";
import { createSession, updateSession } from "@/lib/session-store";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  studentId: string;
  role: string;
  mode?: "technical" | "behavioural";
  stage?: 1 | 2;
  resumeSummary?: string;
};

function generateSessionId(): string {
  return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function firstQuestion(mode: Body["mode"], role: string): string {
  if (mode === "technical") {
    return `Walk me through one project or problem that best proves your readiness for ${role}. Focus on the architecture, trade-offs, and the hardest decision you made.`;
  }

  return `Tell me about a time you received difficult feedback or faced a setback. What happened, what did you do, and what changed afterwards?`;
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

  const resolvedMode = body.stage === 1 ? "technical" : body.stage === 2 ? "behavioural" : body.mode;

  if (!resolvedMode || !["technical", "behavioural"].includes(resolvedMode)) {
    return NextResponse.json(
      { error: "mode must be 'technical' or 'behavioural', or stage must be 1 or 2" },
      { status: 400 }
    );
  }

  const sessionId = generateSessionId();

  const session = createSession({
    sessionId,
    studentId: body.studentId,
    role: body.role,
    mode: resolvedMode,
    resumeSummary: body.resumeSummary,
  });
  const question = firstQuestion(resolvedMode, body.role);
  updateSession(session.sessionId, {
    transcript: [{ timestamp: Date.now(), role: "assistant", content: question }],
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.sessionId,
    firstQuestion: question,
    message: "Session created.",
    mode: session.mode,
  });
}
