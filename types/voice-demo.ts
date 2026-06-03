/**
 * Voice Demo — Shared TypeScript types
 */

export interface Profile {
  fullName: string;
  email: string;
  phone: string;
  careerAspiration: string;
  targetRole: string;
  experienceLevel: "fresher" | "1-2 years" | "2-5 years" | "5+ years";
  skills: string[];
  consentGiven: boolean;
  createdAt: number;
}

export interface ParsedResume {
  candidateSummary: string;
  skills: string[];
  projects: { title: string; stack: string[]; impact: string }[];
  achievements: string[];
  strengths: string[];
  skillGaps: string[];
  interviewFocusAreas: string[];
  questionSeeds: string[];
  source: string;
  parsedAt: number;
}

export type QuestionMode = "voice" | "text" | "code";

export type InterviewPhase =
  | "intro"
  | "resume-deep-dive"
  | "technical"
  | "scenario"
  | "text-checkpoint"
  | "behavioural"
  | "complete";

export interface TranscriptMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: number;
  mode: QuestionMode;
  phase: InterviewPhase;
}

export interface InterviewState {
  sessionId: string;
  profile: Profile;
  resume: ParsedResume | null;
  phase: InterviewPhase;
  questionIndex: number;
  totalQuestions: number;
  questions: QuestionConfig[];
  transcript: TranscriptMessage[];
  startedAt: number | null;
  elapsedSeconds: number;
  isPaused: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  recordingActive: boolean;
  demoMode: boolean;
}

export interface QuestionConfig {
  id: string;
  phase: InterviewPhase;
  mode: QuestionMode;
  questionText: string;
  expectedDuration: number;
}

export interface ReportData {
  candidateName: string;
  targetRole: string;
  resumeSummary: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  roleFitScore: number;
  strengths: string[];
  developmentAreas: string[];
  resumeConsistency: { label: string; status: "good" | "warn" | "issue"; note: string }[];
  transcript: TranscriptMessage[];
  aiObservations: string[];
  nextRound: string;
  source: "gemini" | "demo";
  generatedAt: number;
}

export interface ResumeAnalysisBody {
  profile: Profile;
  pdfBase64: string;
  filename: string;
}

export interface TranscribeBody {
  audioBase64: string;
  mimeType: string;
}

export interface NextQuestionBody {
  profile: Profile;
  resume: ParsedResume | null;
  transcript: TranscriptMessage[];
  questionIndex: number;
  totalQuestions: number;
  phase: InterviewPhase;
  previousAnswer: string;
}

export interface TTSBody {
  text: string;
  languageCode?: string;
}

export interface ReportBody {
  profile: Profile;
  resume: ParsedResume | null;
  transcript: TranscriptMessage[];
}