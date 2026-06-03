import Link from "next/link";
import { Section } from "@/components/glass";
import { Bar, Sparkline } from "@/components/score-ring";
import { coachSessions, getStudent } from "@/lib/data";

export default async function CoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <div className="relative overflow-hidden">
      {/* HERO STRIP */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 h-[280px] opacity-40" />
        <div className="mx-auto max-w-7xl px-5 pt-8 pb-8 sm:px-8 sm:pt-12 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="pill">
                <IconCompass /> Coach Workspace
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight leading-[1.05] text-ink-900 sm:text-3xl md:text-4xl">
                Meera Iyer
                <br />
                Coaching Console
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-ink-500 sm:text-base">
                Communication &amp; confidence · DNLA-certified ·
                <span className="font-semibold text-ink-900"> 184 sessions</span> ·
                Avg lift <span className="font-semibold text-ink-900">+11</span> behavioural score.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-900 text-sm font-semibold text-white sm:h-16 sm:w-16">
                  MI
                </div>
                <div className="hidden sm:block">
                  <div className="label">Today</div>
                  <div className="font-semibold text-ink-900">9 sessions scheduled</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost">Calendar</button>
                <button className="btn-primary">Open availability</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {/* KPI STRIP */}
        <div className="card p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
            <KPI label="Active mentees" value="14" />
            <KPI label="Sessions this week" value="9" delta="+2 vs last" />
            <KPI label="Avg lift / mentee" value="+11" delta="behavioural score" />
            <KPI label="Rating" value="★ 4.9" delta="184 sessions" />
          </div>
        </div>

        {/* UPCOMING */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconCalendar /> This Week</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Upcoming Sessions
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {coachSessions.filter((c) => c.status === "Upcoming").map((c) => {
              const s = getStudent(c.studentId);
              return (
                <div key={c.id} className="card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-xs font-semibold text-white">
                        {s?.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-ink-900">{s?.name}</div>
                        <div className="text-xs text-ink-500">{c.topic}</div>
                      </div>
                    </div>
                    <span className="chip-soft">{c.date}</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    <Row label="Behavioural" v={s?.fit.behavioural ?? 0} />
                    <Row label="Fit score" v={s?.fit.fit ?? 0} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={`/student/${c.studentId}`} className="btn-ghost flex-1 justify-center text-center">
                      Review profile
                    </Link>
                    <button className="btn-primary flex-1 justify-center">
                      Start session
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* RECENT OUTCOMES */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconCheck /> Recent Outcomes</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Coaching Outcomes
            </h2>
          </div>
          <div className="card p-2 sm:p-3">
            {coachSessions.filter((c) => c.status === "Completed").map((c) => {
              const s = getStudent(c.studentId);
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-b border-ink-100 px-3 py-4 last:border-0 hover:bg-ink-50 sm:px-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink-900 text-xs font-semibold text-white">
                      {s?.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">{s?.name}</div>
                      <div className="text-[11px] text-ink-500">{c.topic} · {c.date}</div>
                    </div>
                  </div>
                  <span className="chip-success">{c.outcome}</span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* MENTEE TRAJECTORY */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconLine /> Mentee Growth</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Trajectory · Priya Raghavan
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">
              Compound growth across the dimensions you've been coaching to.
            </p>
          </div>
          <div className="card p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Trend label="Behavioural" data={[40, 42, 45, 48, 52, 55, 56, 58]} />
              <Trend label="Feedback reaction" data={[3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.0]} max={7} />
              <Trend label="Assertiveness" data={[3.5, 3.6, 3.7, 3.7, 3.8, 3.9, 3.9, 4.1]} max={7} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function KPI({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="label">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{value}</div>
      {delta && <div className="mt-1 text-xs text-ink-500">{delta}</div>}
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="text-base font-bold tracking-tight tabular-nums text-ink-900">{v}</span>
      </div>
      <Bar value={v} tone="dark" />
    </div>
  );
}

function Trend({ label, data, max = 100 }: { label: string; data: number[]; max?: number }) {
  const last = data[data.length - 1];
  const delta = +(last - data[0]).toFixed(1);
  return (
    <div className="card-soft p-5">
      <div className="label">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{typeof last === "number" ? last : ""}</span>
        <span className={`mb-1 text-xs font-semibold ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}
        </span>
      </div>
      <div className="mt-3">
        <Sparkline data={data.map((d) => (max !== 100 ? (d / max) * 100 : d))} />
      </div>
    </div>
  );
}

/* Inline icons */
function IconCompass() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconLine() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m7 17 4-4 4 4 5-5" />
    </svg>
  );
}
