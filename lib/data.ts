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

export const students: Student[] = [
  {
    id: "priya",
    name: "Priya Raghavan",
    avatar: "PR",
    branch: "Computer Science",
    year: "Final Year",
    college: "Atherix Institute of Tech",
    cgpa: 8.6,
    targetRole: "Full-stack Software Engineer",
    resumeSummary:
      "Final-year CS student with strong systems fundamentals. Built two production-grade web apps and contributed to an open-source ML library.",
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
    skills: ["TypeScript", "React", "Node.js", "Python", "Postgres", "Docker"],
    fit: { technical: 84, behavioural: 58, fit: 72, successProbability: 71 },
    dnla: [
      { competency: "Drive", group: "Achievement Dynamics", score: 6.2, benchmark: 5.8, insight: "Strong intrinsic drive, especially around technical challenges." },
      { competency: "Motivation", group: "Achievement Dynamics", score: 5.6, benchmark: 5.8, insight: "Drops on tasks perceived as routine." },
      { competency: "Self-confidence", group: "Achievement Dynamics", score: 4.4, benchmark: 5.5, insight: "Tends to under-claim ownership in group contexts." },
      { competency: "Empathy", group: "Interpersonal Skills", score: 5.1, benchmark: 5.6, insight: "Listens well; struggles to read non-verbal cues in interviews." },
      { competency: "Assertiveness", group: "Interpersonal Skills", score: 3.8, benchmark: 5.4, insight: "Hesitant to push back on stakeholders." },
      { competency: "Sociability", group: "Interpersonal Skills", score: 4.9, benchmark: 5.2, insight: "Comfortable 1:1, less so in panel settings." },
      { competency: "Systematic mentality", group: "Execution", score: 6.4, benchmark: 5.7, insight: "Strong structured thinking under pressure." },
      { competency: "Initiative", group: "Execution", score: 5.8, benchmark: 5.6, insight: "Self-starts when scope is clear." },
      { competency: "Feedback reaction", group: "Stress & Resilience", score: 3.6, benchmark: 5.3, insight: "Defensive on critical feedback · flagged risk." },
      { competency: "Resilience", group: "Stress & Resilience", score: 4.7, benchmark: 5.4, insight: "Recovers but takes 2-3 days after setbacks." },
      { competency: "Outlook", group: "Stress & Resilience", score: 5.5, benchmark: 5.5, insight: "Balanced optimism." },
    ],
    strengths: ["Structured technical reasoning", "High intrinsic drive", "Solid coding fundamentals"],
    developmentAreas: ["Assertiveness in stakeholder conversations", "Receiving critical feedback", "Self-advocacy in group settings"],
    risks: ["Defensive on feedback → may stall in feedback-heavy cultures"],
    status: "In progress",
  },
  {
    id: "rohan",
    name: "Rohan Mehta",
    avatar: "RM",
    branch: "Mechanical → MBA",
    year: "MBA, 2nd Year",
    college: "Atherix Institute of Tech",
    cgpa: 8.1,
    targetRole: "Product Manager (B2B SaaS)",
    resumeSummary:
      "Ex-mech engineer at a Tier-1 OEM. Led 2 cross-functional shop-floor digitization projects. Pivoting into PM via MBA.",
    projects: [
      { title: "OEE Dashboard Rollout", stack: ["Stakeholder mgmt", "PowerBI", "Kaizen"], impact: "Adoption across 4 plants, +6.2% OEE" },
      { title: "Vendor consolidation playbook", stack: ["Procurement", "Excel modelling"], impact: "₹3.4Cr annualized savings" },
    ],
    skills: ["Roadmapping", "Stakeholder mgmt", "SQL (basic)", "Figma (basic)", "Lean"],
    fit: { technical: 64, behavioural: 81, fit: 76, successProbability: 78 },
    dnla: [
      { competency: "Drive", group: "Achievement Dynamics", score: 5.9, benchmark: 5.8, insight: "Steady, goal-anchored drive." },
      { competency: "Motivation", group: "Achievement Dynamics", score: 6.1, benchmark: 5.8, insight: "Motivated by impact metrics." },
      { competency: "Self-confidence", group: "Achievement Dynamics", score: 5.8, benchmark: 5.5, insight: "Comfortable owning outcomes." },
      { competency: "Empathy", group: "Interpersonal Skills", score: 6.0, benchmark: 5.6, insight: "Strong user empathy from field exposure." },
      { competency: "Assertiveness", group: "Interpersonal Skills", score: 5.6, benchmark: 5.4, insight: "Healthy push-back style." },
      { competency: "Sociability", group: "Interpersonal Skills", score: 6.2, benchmark: 5.2, insight: "Naturally collaborative." },
      { competency: "Systematic mentality", group: "Execution", score: 5.4, benchmark: 5.7, insight: "Good but trails on structured tech reasoning." },
      { competency: "Initiative", group: "Execution", score: 6.0, benchmark: 5.6, insight: "Initiates org-level moves." },
      { competency: "Feedback reaction", group: "Stress & Resilience", score: 5.7, benchmark: 5.3, insight: "Takes feedback well." },
      { competency: "Resilience", group: "Stress & Resilience", score: 5.5, benchmark: 5.4, insight: "Stable under load." },
      { competency: "Outlook", group: "Stress & Resilience", score: 5.9, benchmark: 5.5, insight: "Optimistic, evidence-driven." },
    ],
    strengths: ["Stakeholder maturity", "Outcome ownership", "Cross-functional execution"],
    developmentAreas: ["Technical depth (SQL, analytics)", "Crisp written PRDs", "Product instinct on consumer surfaces"],
    risks: [],
    status: "Interview-ready",
  },
  {
    id: "kabir",
    name: "Kabir Singh",
    avatar: "KS",
    branch: "Information Tech",
    year: "Pre-final Year",
    college: "Atherix Institute of Tech",
    cgpa: 7.2,
    targetRole: "Backend Engineer",
    resumeSummary:
      "Hands-on backend builder. Strong DSA, weak on system design articulation. Looking to convert internship → PPO.",
    projects: [
      { title: "Realtime chat (10k concurrent)", stack: ["Go", "Redis", "WebSocket"], impact: "Used by college fest, 0 downtime" },
      { title: "DSA blog", stack: ["Writing"], impact: "8.5k monthly readers" },
    ],
    skills: ["Go", "Python", "Redis", "Postgres", "Linux", "Git"],
    fit: { technical: 78, behavioural: 49, fit: 65, successProbability: 61 },
    dnla: [
      { competency: "Drive", group: "Achievement Dynamics", score: 6.4, benchmark: 5.8, insight: "Aggressive personal goals." },
      { competency: "Motivation", group: "Achievement Dynamics", score: 6.0, benchmark: 5.8, insight: "Highly intrinsic." },
      { competency: "Self-confidence", group: "Achievement Dynamics", score: 6.6, benchmark: 5.5, insight: "Borderline overconfident · risk indicator." },
      { competency: "Empathy", group: "Interpersonal Skills", score: 3.9, benchmark: 5.6, insight: "Struggles to read team dynamics." },
      { competency: "Assertiveness", group: "Interpersonal Skills", score: 5.7, benchmark: 5.4, insight: "Strong but blunt." },
      { competency: "Sociability", group: "Interpersonal Skills", score: 4.0, benchmark: 5.2, insight: "Prefers heads-down work." },
      { competency: "Systematic mentality", group: "Execution", score: 5.9, benchmark: 5.7, insight: "Good when problems are well-scoped." },
      { competency: "Initiative", group: "Execution", score: 6.2, benchmark: 5.6, insight: "Picks up unowned problems." },
      { competency: "Feedback reaction", group: "Stress & Resilience", score: 3.5, benchmark: 5.3, insight: "Argues with critical feedback · flagged." },
      { competency: "Resilience", group: "Stress & Resilience", score: 5.0, benchmark: 5.4, insight: "Average recovery from setbacks." },
      { competency: "Outlook", group: "Stress & Resilience", score: 5.3, benchmark: 5.5, insight: "Slightly negative outlook on team dependencies." },
    ],
    strengths: ["Raw technical horsepower", "Self-driven", "Builds end-to-end"],
    developmentAreas: ["Collaborative communication", "Receiving disagreement gracefully", "Reading team dynamics"],
    risks: ["Confidence vs accuracy gap → overconfidence flag", "Defensive on feedback"],
    status: "In progress",
  },
];

export const examAspirants: ExamAspirant[] = [
  {
    id: "anjali",
    name: "Anjali Verma",
    avatar: "AV",
    exam: "UPSC Civil Services",
    attempt: "2nd Attempt",
    monthsPreparing: 18,
    successPotential: 54,
    motivation: 62,
    consistency: 48,
    resilience: 51,
    stressIndex: 71,
    risks: [
      { label: "Declining study consistency", severity: "high", detected: "Past 3 weeks" },
      { label: "Elevated stress markers", severity: "high", detected: "Past 10 days" },
      { label: "Social withdrawal pattern", severity: "medium", detected: "Past 2 weeks" },
    ],
    consistencyTrend: [82, 78, 74, 72, 68, 66, 62, 58, 54, 52, 48, 46],
    moodTrend: [70, 68, 66, 64, 60, 58, 55, 52, 50, 47, 44, 42],
    studyHoursTrend: [9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4],
    institute: "Lakshya Civils Academy",
  },
  {
    id: "dhruv",
    name: "Dhruv Khanna",
    avatar: "DK",
    exam: "GATE · CSE",
    attempt: "1st Attempt",
    monthsPreparing: 9,
    successPotential: 78,
    motivation: 81,
    consistency: 84,
    resilience: 76,
    stressIndex: 38,
    risks: [],
    consistencyTrend: [70, 72, 74, 78, 80, 82, 81, 83, 84, 85, 84, 86],
    moodTrend: [72, 74, 76, 78, 78, 80, 81, 82, 81, 83, 82, 84],
    studyHoursTrend: [6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 9, 10],
    institute: "Lakshya Civils Academy",
  },
  {
    id: "ira",
    name: "Ira Banerjee",
    avatar: "IB",
    exam: "GMAT",
    attempt: "1st Attempt",
    monthsPreparing: 5,
    successPotential: 67,
    motivation: 72,
    consistency: 68,
    resilience: 64,
    stressIndex: 52,
    risks: [
      { label: "Inconsistent mock test prep", severity: "medium", detected: "Past 2 weeks" },
    ],
    consistencyTrend: [60, 64, 66, 68, 70, 72, 70, 68, 67, 66, 68, 70],
    moodTrend: [65, 68, 70, 71, 70, 72, 70, 68, 69, 71, 70, 72],
    studyHoursTrend: [4, 5, 5, 6, 6, 6, 5, 5, 6, 6, 6, 7],
    institute: "Lakshya Civils Academy",
  },
];

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

export const institutes: Institute[] = [
  {
    id: "atherix",
    name: "Atherix Institute of Tech",
    kind: "placement",
    cohort: 412,
    interviewReady: 268,
    avgFit: 71,
    topGap: "Assertiveness",
    insights: [
      { label: "Mechanical batch lacks assertiveness", severity: "warn" },
      { label: "CS batch · high technical, low behavioural readiness", severity: "warn" },
      { label: "MBA batch · strongest placement readiness this cycle", severity: "info" },
    ],
    batches: [
      { name: "B.Tech CS · 2026", size: 124, avgTech: 78, avgBehav: 58, avgFit: 68, topGap: "Assertiveness" },
      { name: "B.Tech Mech · 2026", size: 96, avgTech: 64, avgBehav: 52, avgFit: 58, topGap: "Communication" },
      { name: "B.Tech IT · 2026", size: 88, avgTech: 74, avgBehav: 61, avgFit: 67, topGap: "Empathy" },
      { name: "MBA · 2026", size: 104, avgTech: 62, avgBehav: 79, avgFit: 74, topGap: "Tech depth" },
    ],
  },
  {
    id: "lakshya",
    name: "Lakshya Civils Academy",
    kind: "exam",
    cohort: 184,
    interviewReady: 0,
    avgFit: 64,
    topGap: "Consistency",
    insights: [
      { label: "12 students show elevated stress markers · review urgently", severity: "danger" },
      { label: "Cluster: declining consistency across 1st-attempt aspirants", severity: "warn" },
      { label: "GATE batch · strong trajectory, low intervention need", severity: "info" },
    ],
    batches: [
      { name: "UPSC GS · 2027", size: 72, avgTech: 0, avgBehav: 58, avgFit: 58, topGap: "Resilience" },
      { name: "GATE CSE · 2027", size: 56, avgTech: 0, avgBehav: 78, avgFit: 78, topGap: "Mock exam consistency" },
      { name: "GMAT · Rolling", size: 56, avgTech: 0, avgBehav: 67, avgFit: 67, topGap: "Time management" },
    ],
  },
];

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

export const recruiterPool: RecruiterRow[] = [
  { studentId: "rohan", name: "Rohan Mehta", college: "Atherix IoT", role: "PM · B2B SaaS", fit: 76, tech: 64, behav: 81, success: 78, flags: ["Stakeholder mature"] },
  { studentId: "priya", name: "Priya Raghavan", college: "Atherix IoT", role: "SWE · Full-stack", fit: 72, tech: 84, behav: 58, success: 71, flags: ["Defensive on feedback"] },
  { studentId: "kabir", name: "Kabir Singh", college: "Atherix IoT", role: "Backend Eng", fit: 65, tech: 78, behav: 49, success: 61, flags: ["Overconfidence flag"] },
  { studentId: "x1", name: "Aarav Iyer", college: "NIT Trichy", role: "SWE · Backend", fit: 81, tech: 86, behav: 74, success: 83, flags: [] },
  { studentId: "x2", name: "Meera Joshi", college: "BITS Pilani", role: "Data Eng", fit: 79, tech: 81, behav: 76, success: 79, flags: [] },
  { studentId: "x3", name: "Vihaan Reddy", college: "IIT Indore", role: "SWE · Full-stack", fit: 84, tech: 88, behav: 78, success: 85, flags: ["Top 5%"] },
  { studentId: "x4", name: "Sanya Kapoor", college: "VIT Vellore", role: "PM · Consumer", fit: 70, tech: 58, behav: 79, success: 72, flags: [] },
  { studentId: "x5", name: "Ishaan Bhat", college: "IIIT Hyderabad", role: "ML Eng", fit: 77, tech: 82, behav: 69, success: 75, flags: [] },
];

export type CoachSession = {
  id: string;
  studentId: string;
  topic: string;
  date: string;
  status: "Upcoming" | "Completed";
  outcome?: string;
};

export const coachSessions: CoachSession[] = [
  { id: "c1", studentId: "priya", topic: "Receiving critical feedback", date: "Tue 20 May, 5:00 PM", status: "Upcoming" },
  { id: "c2", studentId: "kabir", topic: "Collaborative communication", date: "Wed 21 May, 7:00 PM", status: "Upcoming" },
  { id: "c3", studentId: "rohan", topic: "Crisp written PRDs", date: "Last Thu", status: "Completed", outcome: "Improved structure score 5.4 → 6.1" },
  { id: "c4", studentId: "priya", topic: "Self-advocacy in panels", date: "Last Mon", status: "Completed", outcome: "Recorded role-play; 2 follow-ups" },
];

export const personas = [
  { kind: "student", id: "priya", label: "Student · Priya (Placement)", icon: "🎓" },
  { kind: "student", id: "rohan", label: "Student · Rohan (Placement)", icon: "🎓" },
  { kind: "student", id: "kabir", label: "Student · Kabir (Placement)", icon: "🎓" },
  { kind: "exam", id: "anjali", label: "Aspirant · Anjali (UPSC)", icon: "📚" },
  { kind: "exam", id: "dhruv", label: "Aspirant · Dhruv (GATE)", icon: "📚" },
  { kind: "institute", id: "atherix", label: "Institute · Atherix (Placement)", icon: "🏛" },
  { kind: "institute", id: "lakshya", label: "Institute · Lakshya (Exam)", icon: "🏛" },
  { kind: "recruiter", id: "northbridge", label: "Recruiter · Northbridge Capital", icon: "💼" },
  { kind: "coach", id: "meera", label: "Coach · Meera Iyer", icon: "🧭" },
] as const;

export function getStudent(id: string) {
  return students.find((s) => s.id === id);
}
export function getExam(id: string) {
  return examAspirants.find((e) => e.id === id);
}
export function getInstitute(id: string) {
  return institutes.find((i) => i.id === id);
}
