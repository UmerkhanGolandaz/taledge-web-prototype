export type Persona =
  | { kind: "student"; id: string }
  | { kind: "exam"; id: string }
  | { kind: "institute"; id: string }
  | { kind: "recruiter"; id: string }
  | { kind: "coach"; id: string }
  | { kind: "counsellor"; id: string };

export type DnlaScore = {
  competency: string;
  group:
    | "Achievement Dynamics"
    | "Interpersonal Skills"
    | "Execution"
    | "Stress & Resilience";
  score: number; // 1-7
  benchmark: number; // top performer benchmark
  insight: string;
};

export type Student = {
  id: string;
  name: string;
  avatar: string;
  branch: string;
  year: string;
  college: string;
  cgpa: number;
  targetRole: string;
  resumeSummary: string;
  projects: { title: string; stack: string[]; impact: string }[];
  skills: string[];
  fit: {
    technical: number;
    behavioural: number;
    fit: number;
    successProbability: number;
  };
  dnla: DnlaScore[];
  strengths: string[];
  developmentAreas: string[];
  risks: string[];
  status: "Not started" | "In progress" | "Interview-ready" | "Published";
};

export type ExamAspirant = {
  id: string;
  name: string;
  avatar: string;
  exam: string;
  attempt: string;
  monthsPreparing: number;
  successPotential: number;
  motivation: number;
  consistency: number;
  resilience: number;
  stressIndex: number;
  risks: {
    label: string;
    severity: "low" | "medium" | "high";
    detected: string;
  }[];
  consistencyTrend: number[]; // 0-100 weekly
  moodTrend: number[]; // 0-100 weekly
  studyHoursTrend: number[];
  institute: string;
};

export const students: Student[] = [];

export const examAspirants: ExamAspirant[] = [];

export type Institute = {
  id: string;
  name: string;
  kind: "placement" | "exam";
  cohort: number;
  interviewReady: number;
  avgFit: number;
  topGap: string;
  insights: { label: string; severity: "info" | "warn" | "danger" }[];
  batches: {
    name: string;
    size: number;
    avgTech: number;
    avgBehav: number;
    avgFit: number;
    topGap: string;
  }[];
};

export const institutes: Institute[] = [];

export type RecruiterRow = {
  studentId: string;
  name: string;
  college: string;
  role: string;
  fit: number;
  tech: number;
  behav: number;
  success: number;
  flags: string[];
};

export const recruiterPool: RecruiterRow[] = [];

export type CoachSession = {
  id: string;
  studentId: string;
  topic: string;
  date: string;
  status: "Upcoming" | "Completed";
  outcome?: string;
};

export const coachSessions: CoachSession[] = [];

export const personas = [] as const;

export function getStudent(id: string) {
  return students.find((s) => s.id === id) || {
    id,
    name: "New Candidate",
    avatar: "NC",
    branch: "Computer Science",
    year: "Final Year",
    college: "TalEdge University",
    cgpa: 8.0,
    targetRole: "Software Engineer",
    resumeSummary: "",
    projects: [],
    skills: [],
    fit: { technical: 0, behavioural: 0, fit: 0, successProbability: 0 },
    dnla: [],
    strengths: [],
    developmentAreas: [],
    risks: [],
    status: "Not started" as const
  };
}
export function getExam(id: string) {
  return examAspirants.find((e) => e.id === id) || {
    id,
    name: "New Aspirant",
    avatar: "NA",
    exam: "UPSC Civil Services",
    attempt: "1st Attempt",
    monthsPreparing: 0,
    successPotential: 0,
    motivation: 0,
    consistency: 0,
    resilience: 0,
    stressIndex: 0,
    risks: [],
    consistencyTrend: [],
    moodTrend: [],
    studyHoursTrend: [],
    institute: "TalEdge Institute",
  };
}
export function getInstitute(id: string) {
  return institutes.find((i) => i.id === id) || {
    id,
    name: "TalEdge Institute",
    kind: "placement" as const,
    cohort: 0,
    interviewReady: 0,
    avgFit: 0,
    topGap: "None",
    insights: [],
    batches: [],
  };
}
