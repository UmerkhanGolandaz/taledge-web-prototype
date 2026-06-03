/**
 * File-based session store for interview voice sessions.
 * Persists sessions to a JSON file — survives dev server restarts.
 * For production, replace with Redis/DB-backed store.
 */

import fs from "fs";
import path from "path";

export interface TranscriptEntry {
  timestamp: number;
  role: "assistant" | "user";
  content: string;
}

export interface SessionState {
  sessionId: string;
  studentId: string;
  role: string;
  mode: "technical" | "behavioural";
  resumeSummary?: string;
  transcript: TranscriptEntry[];
  turnIndex: number;
  isDone: boolean;
  rubricScores: Record<string, number>;
  recruiterNotes: string;
  followUpNeeded: boolean;
  createdAt: number;
  updatedAt: number;
}

const SESSION_DIR = path.join(process.cwd(), ".sessions");
const SESSION_FILE = path.join(SESSION_DIR, "sessions.json");

function ensureDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

function loadAll(): Record<string, SessionState> {
  try {
    if (!fs.existsSync(SESSION_FILE)) return {};
    const raw = fs.readFileSync(SESSION_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, SessionState>): void {
  ensureDir();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export function createSession(params: {
  sessionId: string;
  studentId: string;
  role: string;
  mode: "technical" | "behavioural";
  resumeSummary?: string;
}): SessionState {
  const now = Date.now();
  const session: SessionState = {
    sessionId: params.sessionId,
    studentId: params.studentId,
    role: params.role,
    mode: params.mode,
    resumeSummary: params.resumeSummary,
    transcript: [],
    turnIndex: 0,
    isDone: false,
    rubricScores: {},
    recruiterNotes: "",
    followUpNeeded: false,
    createdAt: now,
    updatedAt: now,
  };

  const all = loadAll();
  all[params.sessionId] = session;
  saveAll(all);

  return session;
}

export function getSession(sessionId: string): SessionState | undefined {
  const all = loadAll();
  return all[sessionId];
}

export function updateSession(
  sessionId: string,
  updates: Partial<SessionState>
): SessionState | undefined {
  const all = loadAll();
  const session = all[sessionId];
  if (!session) return undefined;

  const updated: SessionState = {
    ...session,
    ...updates,
    updatedAt: Date.now(),
  };

  all[sessionId] = updated;
  saveAll(all);
  return updated;
}

export function deleteSession(sessionId: string): void {
  const all = loadAll();
  delete all[sessionId];
  saveAll(all);
}

export { SESSION_FILE };