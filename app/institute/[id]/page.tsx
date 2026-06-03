import { notFound } from "next/navigation";
import Link from "next/link";
import { Section } from "@/components/glass";
import { ScoreRing, Bar } from "@/components/score-ring";
import { getInstitute, students, examAspirants } from "@/lib/data";

export default async function InstitutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inst = getInstitute(id);
  if (!inst) notFound();
  const isExam = inst.kind === "exam";
  const ready = Math.round((inst.interviewReady / inst.cohort) * 100);

  return (
    <div className="relative overflow-hidden">
      {/* HERO STRIP */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 h-[280px] opacity-40" />
        <div className="mx-auto max-w-7xl px-5 pt-8 pb-8 sm:px-8 sm:pt-12 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="pill">
                <IconInstitute /> {isExam ? "Competitive Exam Institute" : "Placement Institute"}
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight leading-[1.05] text-ink-900 sm:text-3xl md:text-4xl">
                {inst.name}
                <br />
                Cohort Intelligence
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-ink-500 sm:text-base">
                Cohort of <span className="font-semibold text-ink-900">{inst.cohort}</span> across {inst.batches.length} batches.
                Top development gap surfaced: <span className="font-semibold text-ink-900">{inst.topGap}</span>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost">
                <IconDownload /> Export CSV
              </button>
              <button className="btn-primary">
                Generate shared link
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {/* TOP KPI STRIP */}
        <div className="card p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {!isExam && (
              <div className="flex items-center gap-4">
                <ScoreRing value={ready} size={92} stroke={10} tone="dark" label="Ready" />
                <div>
                  <div className="label">Interview-ready</div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{inst.interviewReady}/{inst.cohort}</div>
                  <div className="text-xs text-ink-500">Threshold: Fit ≥ 70</div>
                </div>
              </div>
            )}
            {isExam && (
              <div className="flex items-center gap-4">
                <ScoreRing value={68} size={92} stroke={10} tone="dark" label="On track" />
                <div>
                  <div className="label">On track</div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-ink-900">125/{inst.cohort}</div>
                  <div className="text-xs text-ink-500">Success Potential ≥ 65</div>
                </div>
              </div>
            )}
            <KPI label={isExam ? "Avg Success Potential" : "Average Fit"} value={`${inst.avgFit}`} delta="+3 wow" />
            <KPI label="Top development gap" value={inst.topGap} />
            <KPI
              label={isExam ? "At-risk students" : "Coaching sessions / wk"}
              value={isExam ? "12" : "47"}
              tone={isExam ? "danger" : "default"}
            />
          </div>
        </div>

        {/* AI INSIGHTS */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconSparkles /> AI Insights</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Generated Signals
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {inst.insights.map((i) => (
              <div
                key={i.label}
                className={`relative rounded-2xl border p-5 sm:p-6 ${
                  i.severity === "danger" ? "border-rose-200 bg-rose-50/50" :
                  i.severity === "warn" ? "border-amber-200 bg-amber-50/50" :
                  "border-ink-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={i.severity === "danger" ? "chip-danger" : i.severity === "warn" ? "chip-warn" : "chip-soft"}>
                    {i.severity === "danger" ? "Action required" : i.severity === "warn" ? "Attention" : "Info"}
                  </span>
                  <span className="label">{`Insight ${String(inst.insights.indexOf(i) + 1).padStart(2, "0")}`}</span>
                </div>
                <p className="mt-4 text-base font-medium leading-snug text-ink-900">{i.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* BATCH COMPETENCY */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconGrid /> Batch Analytics</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Batch-wise Competency
            </h2>
          </div>
          <div className="card overflow-x-auto p-0">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-12 border-b border-ink-200 bg-ink-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                <div className="col-span-4">Batch</div>
                <div className="col-span-1 text-right">Size</div>
                {!isExam && <div className="col-span-2">Technical</div>}
                <div className={!isExam ? "col-span-2" : "col-span-3"}>{isExam ? "Resilience" : "Behavioural"}</div>
                <div className="col-span-1 text-right">{isExam ? "Potential" : "Fit"}</div>
                <div className={!isExam ? "col-span-2 text-right" : "col-span-3 text-right"}>Top gap</div>
              </div>
              {inst.batches.map((b) => (
                <div
                  key={b.name}
                  className="grid grid-cols-12 items-center border-b border-ink-100 px-5 py-4 text-sm last:border-0 hover:bg-ink-50"
                >
                  <div className="col-span-4 font-semibold text-ink-900">{b.name}</div>
                  <div className="col-span-1 text-right tabular-nums text-ink-700">{b.size}</div>
                  {!isExam && (
                    <div className="col-span-2">
                      <Bar value={b.avgTech} tone="dark" />
                    </div>
                  )}
                  <div className={!isExam ? "col-span-2" : "col-span-3"}>
                    <Bar value={b.avgBehav} tone={b.avgBehav > 70 ? "success" : "warn"} />
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-xl font-bold tracking-tight text-ink-900">{b.avgFit}</span>
                  </div>
                  <div className={!isExam ? "col-span-2 text-right text-xs text-ink-600" : "col-span-3 text-right text-xs text-ink-600"}>{b.topGap}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* HEATMAP (placement only) */}
        {!isExam && (
          <Section className="mt-12">
            <div className="mb-5">
              <div className="pill"><IconHeatmap /> DNLA Heatmap</div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                CS Batch Heatmap
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-500">
                Per-student competency across the 11 DNLA dimensions.
              </p>
            </div>
            <div className="card overflow-x-auto p-5 sm:p-6">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-12 gap-1 text-[10px] uppercase tracking-wider text-ink-500">
                  {["Drive", "Motiv.", "Confid.", "Empathy", "Assert.", "Social.", "System.", "Initiat.", "Feedb.", "Resil.", "Outlook", "Avg"].map((c) => (
                    <div key={c} className="px-2 py-1.5 font-semibold">{c}</div>
                  ))}
                  {Array.from({ length: 6 }).map((_, row) => <HeatRow key={row} />)}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-ink-600">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-rose-300" /> &lt; 4
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-amber-300" /> 4–5
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-emerald-300" /> 5+
                  </div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* STUDENT LIST */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconUsers /> {isExam ? "Attention List" : "Roster"}</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              {isExam ? <>Aspirants Needing Attention</> : <>Cohort Roster</>}
            </h2>
          </div>
          <div className="card p-2 sm:p-3">
            <div className="space-y-1">
              {(isExam ? examAspirants : students).map((s: any) => (
                <Link
                  key={s.id}
                  href={isExam ? `/exam/${s.id}` : `/student/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-ink-50 sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-900 text-xs font-semibold text-white">
                      {s.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink-900">{s.name}</div>
                      <div className="truncate text-[11px] text-ink-500">
                        {isExam ? `${s.exam} · ${s.attempt}` : `${s.branch} · ${s.year}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {isExam ? (
                      <>
                        <span className="hidden text-xs text-ink-500 sm:inline">Stress {s.stressIndex}</span>
                        <span className={s.stressIndex > 60 ? "chip-danger" : "chip-success"}>
                          {s.stressIndex > 60 ? "At risk" : "On track"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="hidden text-xs text-ink-500 sm:inline">Fit {s.fit.fit}</span>
                        <span className={s.status === "Interview-ready" ? "chip-success" : "chip-warn"}>
                          {s.status}
                        </span>
                      </>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-400">
                      <path d="M9 6l6 6-6 6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function KPI({ label, value, delta, tone = "default" }: { label: string; value: string; delta?: string; tone?: "default" | "danger" }) {
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="label">{label}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${tone === "danger" ? "text-rose-600" : "text-ink-900"}`}>{value}</div>
      {delta && <div className="mt-1 text-xs font-medium text-emerald-600">{delta}</div>}
    </div>
  );
}

function HeatRow() {
  const cells = Array.from({ length: 11 }).map(() => Math.random() * 7);
  const avg = cells.reduce((a, b) => a + b, 0) / cells.length;
  return (
    <>
      {cells.map((v, i) => (
        <div
          key={i}
          className="h-9 rounded"
          style={{
            background: v < 4 ? "#fda4af" : v < 5 ? "#fcd34d" : "#86efac",
          }}
        />
      ))}
      <div
        className="grid h-9 place-items-center rounded text-xs font-bold tabular-nums tracking-tight text-ink-900"
        style={{
          background: avg < 4 ? "#fda4af" : avg < 5 ? "#fcd34d" : "#86efac",
        }}
      >
        {avg.toFixed(1)}
      </div>
    </>
  );
}

/* Inline icons */
function IconInstitute() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V10l7-5 7 5v11" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconSparkles() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.7L20 10l-5 4 1.5 6L12 17l-4.5 3L9 14l-5-4 6.1-1.3z" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconHeatmap() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
