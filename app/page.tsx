import Link from "next/link";
import { Logo } from "@/components/logo";

const roles: {
  initial: string;
  title: string;
  desc: string;
  href: string;
}[] = [
  {
    initial: "C",
    title: "Candidate · Placement Track",
    desc: "AI interviews, DNLA, Fit Score, development pathway.",
    href: "/student/priya",
  },
  {
    initial: "A",
    title: "Competitive Exam Aspirant",
    desc: "DNLA Success Factor, counselling, risk patterns.",
    href: "/exam/anjali",
  },
  {
    initial: "I",
    title: "Placement Institute",
    desc: "Batch competency, heatmaps, interview-ready analytics.",
    href: "/institute/atherix",
  },
  {
    initial: "E",
    title: "Competitive Exam Institute",
    desc: "Behavioural early-warning and intervention planning.",
    href: "/institute/lakshya",
  },
  {
    initial: "R",
    title: "Recruiter",
    desc: "Filter candidates by fit, technical, behavioural & success.",
    href: "/recruiter/northbridge",
  },
  {
    initial: "T",
    title: "Coach / Counsellor",
    desc: "Manage mentees, sessions, and measurable outcomes.",
    href: "/coach/meera",
  },
  {
    initial: "V",
    title: "AI Voice Interview",
    desc: "Real-time voice-powered interview with Gemini AI.",
    href: "/interview",
  },
];

const bullets: { title: string; desc: string }[] = [
  {
    title: "AI-driven Fit Score",
    desc: "Technical, behavioural, and success probability synthesized from a 16-feature rubric.",
  },
  {
    title: "DNLA + AI + Coaching",
    desc: "Closed-loop system: assess, interpret, evaluate, improve, track, achieve.",
  },
  {
    title: "Dual-track intelligence",
    desc: "Adapts to placement readiness or competitive exam preparation at onboarding.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT */}
        <div className="flex flex-col justify-between border-b border-ink-200 px-6 py-10 sm:px-10 md:py-14 lg:border-b-0 lg:border-r lg:px-14 lg:py-16">
          <div>
            <Logo />

            <h1 className="mt-12 text-3xl font-bold tracking-tight leading-[1.1] text-ink-900 sm:text-4xl md:mt-16 md:text-[2.75rem]">
              Streamline talent
              <br />
              intelligence at scale
            </h1>

            <p className="mt-5 max-w-lg text-base text-ink-500 sm:text-[17px]">
              One platform for students, exam aspirants, institutes, recruiters, and
              coaches · combining DNLA psychometrics with AI evaluation and human
              coaching.
            </p>

            <ul className="mt-10 space-y-5">
              {bullets.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900" />
                  <div>
                    <div className="text-[15px] font-semibold text-ink-900">
                      {b.title}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-500">{b.desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/onboarding" className="btn-primary">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
                Start Onboarding
              </Link>
              <Link href="/student/priya" className="btn-ghost">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
                </svg>
                Student Demo (Priya)
                <span className="text-ink-400">→</span>
              </Link>
            </div>
          </div>

          <div className="mt-12 hidden text-xs text-ink-400 lg:block">
            Taledge © 2026. Talent Intelligence &amp; Success Platform.
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-start justify-center px-6 py-10 sm:px-10 md:py-14 lg:items-center lg:px-14 lg:py-16">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-[2rem]">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Select a role to explore the platform.
            </p>

            <div className="mt-6 space-y-3">
              {roles.map((r) => (
                <Link
                  key={r.title}
                  href={r.href}
                  className="card card-hover group flex items-center gap-4 px-4 py-4 sm:px-5"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-900 text-sm font-semibold text-white">
                    {r.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-ink-900">
                      {r.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-ink-500 sm:text-[13px]">
                      {r.desc}
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-ink-900"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}

              <Link
                href="/coach-ai"
                className="card card-hover group flex items-center gap-4 px-4 py-4 sm:px-5"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink-300 bg-white text-sm font-semibold text-ink-900">
                  P
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[15px] font-semibold text-ink-900">
                      AI Coach
                    </div>
                    <span className="chip-soft !py-0.5 !text-[10px]">
                      Phase 2 preview
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-500 sm:text-[13px]">
                    Real-time voice coaching for sales, leadership, sports, blue-collar.
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-ink-900"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="mt-8 text-xs text-ink-500">
              New here?{" "}
              <Link
                href="/onboarding"
                className="font-medium text-ink-900 underline-offset-4 hover:underline"
              >
                Start onboarding
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-200 px-6 py-4 text-xs text-ink-400 sm:px-10 lg:hidden">
        Taledge © 2026. Talent Intelligence &amp; Success Platform.
      </div>
    </div>
  );
}
