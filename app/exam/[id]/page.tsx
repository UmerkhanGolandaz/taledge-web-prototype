import { notFound } from "next/navigation";
import { Section } from "@/components/glass";
import { ScoreRing, Bar, Sparkline } from "@/components/score-ring";
import { getExam } from "@/lib/data";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = getExam(id);
  if (!e) notFound();

  const sev = (s: "low" | "medium" | "high") =>
    s === "high" ? "chip-danger" : s === "medium" ? "chip-warn" : "chip";

  return (
    <div className="relative overflow-hidden">
      {/* HERO STRIP */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 h-[280px] opacity-40" />
        <div className="mx-auto max-w-7xl px-5 pt-8 pb-8 sm:px-8 sm:pt-12 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="pill">
                <IconAspirant /> Competitive Exam Track · Aspirant
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight leading-[1.05] text-ink-900 sm:text-3xl md:text-4xl">
                {e.name}
                <br />
                Success Profile
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-500">
                <span className="font-medium text-ink-700">{e.exam}</span>
                <span className="text-ink-300">·</span>
                <span>{e.attempt}</span>
                <span className="text-ink-300">·</span>
                <span>{e.monthsPreparing} months in</span>
                <span className="text-ink-300">·</span>
                <span>{e.institute}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip-soft">DNLA Success Factor</span>
              <span className={e.risks.length ? "chip-danger" : "chip-success"}>
                {e.risks.length ? `${e.risks.length} risk flags` : "No risk flags"}
              </span>
              <span className="chip">Aspirant + institute only</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-900 text-sm font-semibold text-white sm:h-16 sm:w-16">
              {e.avatar}
            </div>
            <div>
              <div className="label">Today</div>
              <div className="font-semibold text-ink-900">Recovery latency 2.4 days · target 1.5</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {/* SUCCESS POTENTIAL */}
        <div className="card p-5 sm:p-7">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="flex justify-center lg:col-span-3">
              <ScoreRing
                value={e.successPotential}
                size={180}
                stroke={14}
                label="Success Potential"
                sub={e.exam}
                tone={e.successPotential >= 70 ? "success" : e.successPotential >= 55 ? "dark" : "danger"}
              />
            </div>
            <div className="space-y-4 lg:col-span-6">
              <Row label="Motivation" v={e.motivation} tone="success" />
              <Row label="Consistency" v={e.consistency} tone={e.consistency > 70 ? "success" : "warn"} />
              <Row label="Resilience" v={e.resilience} tone="dark" />
              <Row label="Stress Index" hint="lower is better" v={e.stressIndex} tone={e.stressIndex > 60 ? "danger" : "success"} />
            </div>
            <div className="space-y-2 lg:col-span-3">
              <button className="btn-primary w-full">
                Book counselling
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
              <button className="btn-ghost w-full">Take re-assessment</button>
              <button className="btn-ghost w-full">View detailed DNLA</button>
            </div>
          </div>
        </div>

        {/* BEHAVIOURAL RISK */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconShield /> Risk Patterns</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Behavioural Signals
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">
              Non-clinical indicators · Visible only to you and your institute.
            </p>
          </div>
          <div className="card p-5 sm:p-7">
            {e.risks.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-ink-700">
                No critical risk patterns detected. Continue current preparation cadence.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {e.risks.map((r) => (
                  <div
                    key={r.label}
                    className="card-soft p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={sev(r.severity)}>{r.severity.toUpperCase()}</span>
                      <span className="label">{r.detected}</span>
                    </div>
                    <div className="mt-3 font-semibold text-ink-900">{r.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* TREND SIGNALS */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconLine /> 12-Week Trends</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Trajectory Signals
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TrendCard label="Study consistency" data={e.consistencyTrend} tone={e.consistencyTrend[e.consistencyTrend.length - 1] > 70 ? "success" : "warn"} />
            <TrendCard label="Mood index" data={e.moodTrend} tone={e.moodTrend[e.moodTrend.length - 1] > 60 ? "success" : "danger"} />
            <TrendCard label="Daily study hours" data={e.studyHoursTrend} tone="dark" suffix="h" />
          </div>
        </Section>

        {/* COUNSELLOR */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconUser /> Structured Interview</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Counsellor-led Reset
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">
              Designed by domain experts · Diagnostic, not evaluative.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="card p-5 sm:p-6">
              <div className="label">Recommended counsellor</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-xs font-semibold text-white">
                  AM
                </div>
                <div>
                  <div className="font-semibold text-ink-900">Dr. Anjali Mehta</div>
                  <div className="text-xs text-ink-500">UPSC stress & resilience · 12 yrs</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-ink-700">
                <span className="font-semibold">★ 4.9</span>
                <span className="text-ink-300">·</span>
                <span>240 sessions</span>
              </div>
              <button className="btn-primary mt-4 w-full">Book Tue 21 May, 6PM</button>
            </div>
            <div className="card p-5 sm:p-6">
              <div className="label">Suggested topics</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-700">
                <Topic>Stress reset routine · 14-day plan</Topic>
                <Topic>Restructured timetable with mood checkpoints</Topic>
                <Topic>Re-anchor "why" · purpose reflection</Topic>
                <Topic>Micro-breaks & sleep hygiene</Topic>
              </ul>
            </div>
            <div className="card p-5 sm:p-6">
              <div className="label">Exam context mapping</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-700">
                <Topic>{e.exam} demands sustained discipline</Topic>
                <Topic>Stress endurance threshold: high</Topic>
                <Topic>Behavioural fit: {e.successPotential >= 65 ? "Aligned" : "Misaligned"}</Topic>
                <Topic>Recovery latency: 2.4 days (target: 1.5)</Topic>
              </ul>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Row({ label, hint, v, tone }: { label: string; hint?: string; v: number; tone: "dark" | "success" | "warn" | "danger" }) {
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-ink-700">{label}</span>
          {hint && <span className="text-[11px] uppercase tracking-wider text-ink-400">{hint}</span>}
        </div>
        <span className="text-2xl font-bold tracking-tight tabular-nums text-ink-900">{v}</span>
      </div>
      <Bar value={v} tone={tone} />
    </div>
  );
}

function TrendCard({ label, data, tone, suffix = "" }: { label: string; data: number[]; tone: "dark" | "success" | "warn" | "danger"; suffix?: string }) {
  const last = data[data.length - 1];
  const delta = last - data[0];
  return (
    <div className="card p-5 sm:p-6">
      <div className="label">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{last}{suffix}</span>
        <span className={`mb-1 text-xs font-semibold ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}
        </span>
      </div>
      <div className="mt-3">
        <Sparkline data={data} tone={tone} />
      </div>
    </div>
  );
}

function Topic({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900" />
      <span>{children}</span>
    </li>
  );
}

/* Inline icons */
function IconAspirant() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
