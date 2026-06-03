import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoreRing, Bar } from "@/components/score-ring";
import { FlowReset } from "@/components/flow-reset";
import { getStudent } from "@/lib/data";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = getStudent(id);
  if (!s) notFound();

  const dnlaByGroup = s.dnla.reduce<Record<string, typeof s.dnla>>((acc, d) => {
    acc[d.group] = acc[d.group] || [];
    acc[d.group].push(d);
    return acc;
  }, {});

  return (
    <div className="relative overflow-hidden">
      {/* Faint grid overlay across hero */}
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] opacity-40" />

      {/* HERO */}
      <section className="relative border-b border-ink-200 pt-8 pb-8 sm:pt-12 sm:pb-10">
        <div className="container mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="pill animate-fade-in">
              <SparkIcon /> Placement Track · Candidate Dossier
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip-soft">Target: {s.targetRole}</span>
              <span
                className={
                  s.status === "Interview-ready"
                    ? "chip-success"
                    : s.status === "Published"
                    ? "chip-dark"
                    : "chip-warn"
                }
              >
                {s.status}
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-end gap-6">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-ink-900 text-lg font-bold text-white sm:h-20 sm:w-20 sm:text-xl">
              {s.avatar}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight leading-[1.1] text-ink-900 sm:text-3xl md:text-4xl">
                {s.name}
              </h1>
              <div className="mt-2 text-sm text-ink-500 sm:text-base">
                {s.branch} · {s.year} · CGPA {s.cgpa} · {s.college}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <FlowReset studentId={s.id} />
        {/* Fit Score panel */}
        <div className="card p-5 sm:p-7">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="flex flex-col items-center lg:col-span-3">
              <div className="label mb-3">Composite</div>
              <ScoreRing
                value={s.fit.fit}
                size={180}
                stroke={14}
                label="Fit Score"
                sub={`Success: ${s.fit.successProbability}%`}
                tone="dark"
              />
            </div>
            <div className="space-y-4 lg:col-span-5">
              <ScoreBar label="Technical" value={s.fit.technical} />
              <ScoreBar label="Behavioural" value={s.fit.behavioural} />
              <ScoreBar
                label="Success Probability"
                value={s.fit.successProbability}
                tone="success"
              />
            </div>
            <div className="space-y-2 lg:col-span-4">
              <Link
                href={`/student/${s.id}/interview/technical`}
                className="btn-primary w-full"
              >
                Start Technical Interview
                <ArrowRight />
              </Link>
              <Link
                href={`/student/${s.id}/fit-score`}
                className="btn-ghost w-full"
              >
                View Fit Score Reveal
              </Link>
              <Link
                href={`/student/${s.id}/interview/behavioural`}
                className="btn-ghost w-full"
              >
                Start Behavioural Interview
              </Link>
              <Link href={`/student/${s.id}/dnla`} className="btn-ghost w-full">
                View DNLA Report
              </Link>
              <Link
                href={`/student/${s.id}/development`}
                className="btn-ghost w-full"
              >
                Development Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InsightCard title="Strengths" items={s.strengths} tone="success" />
          <InsightCard
            title="Development areas"
            items={s.developmentAreas}
            tone="warn"
          />
          <InsightCard
            title="Behavioural risks"
            items={s.risks.length ? s.risks : ["No critical risks detected"]}
            tone={s.risks.length ? "danger" : "default"}
          />
        </div>

        {/* Pipeline */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="pill">
                <FlowIcon /> The Pipeline
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                Assessment Pipeline
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StepCard step="01" name="Profile + Resume" status="done" />
            <StepCard
              step="02"
              name="Technical Interview"
              status={s.fit.technical > 50 ? "done" : "active"}
              href={`/student/${s.id}/interview/technical`}
            />
            <StepCard
              step="03"
              name="DNLA Assessment"
              status="done"
              href={`/student/${s.id}/dnla`}
            />
            <StepCard
              step="04"
              name="Behavioural Interview"
              status={s.fit.behavioural > 50 ? "done" : "active"}
              href={`/student/${s.id}/interview/behavioural`}
            />
            <StepCard
              step="05"
              name="Fit Score Reveal"
              status="active"
              href={`/student/${s.id}/fit-score`}
            />
            <StepCard
              step="06"
              name="Development Pathway"
              status="active"
              href={`/student/${s.id}/development`}
            />
          </div>
        </section>

        {/* DNLA snapshot */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="pill">
                <BrainIcon /> The Snapshot
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                DNLA Snapshot
              </h2>
              <p className="mt-2 text-sm text-ink-500 sm:text-base">
                Top competencies across 4 groups.
              </p>
            </div>
            <Link href={`/student/${s.id}/dnla`} className="btn-ghost !py-2 text-xs">
              Full report
              <ArrowRight />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(dnlaByGroup).map(([group, items]) => (
              <div key={group} className="card p-5 sm:p-6">
                <div className="label">{group}</div>
                <div className="mt-4 space-y-4">
                  {items.slice(0, 3).map((d) => (
                    <div key={d.competency}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink-700">
                          {d.competency}
                        </span>
                        <span className="font-semibold tabular-nums text-ink-900">
                          {d.score.toFixed(1)}
                          <span className="text-ink-400">
                            /{d.benchmark.toFixed(1)}
                          </span>
                        </span>
                      </div>
                      <Bar
                        value={(d.score / 7) * 100}
                        tone={
                          d.score >= d.benchmark
                            ? "success"
                            : d.score >= d.benchmark - 0.7
                            ? "warn"
                            : "danger"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Resume */}
        <section className="mt-12">
          <div className="mb-6">
            <div className="pill">
              <DocIcon /> The Record
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Resume Snapshot
            </h2>
          </div>
          <div className="card p-5 sm:p-7">
            <p className="text-base leading-relaxed text-ink-700">{s.resumeSummary}</p>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {s.projects.map((p) => (
                <div key={p.title} className="card-soft p-5">
                  <div className="text-base font-semibold tracking-tight text-ink-900">{p.title}</div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {p.stack.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-ink-600">
                    <span className="label">Impact</span>{" "}
                    <span className="text-ink-700">{p.impact}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="label">Skills</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.skills.map((sk) => (
                  <span key={sk} className="chip">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: number;
  tone?: "dark" | "success" | "warn" | "danger";
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">{label}</span>
        <span className="text-lg font-bold tabular-nums text-ink-900">{value}</span>
      </div>
      <Bar value={value} tone={tone} />
    </div>
  );
}

function InsightCard({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const border =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/40"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50/40"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/40"
      : "border-ink-200 bg-white";
  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
      ? "bg-rose-500"
      : tone === "warn"
      ? "bg-amber-500"
      : "bg-ink-500";
  return (
    <div className={`rounded-2xl border ${border} p-5 sm:p-6`}>
      <div className="label">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-ink-700">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({
  step,
  name,
  status,
  href,
}: {
  step: string;
  name: string;
  status: "done" | "active" | "todo";
  href?: string;
}) {
  const inner = (
    <div
      className={`card p-5 ${href ? "card-hover cursor-pointer" : ""} ${
        status === "active" ? "ring-1 ring-ink-900" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold tracking-tight text-ink-900">
          {step}
        </div>
        <span
          className={
            status === "done"
              ? "chip-success !py-0.5"
              : status === "active"
              ? "chip-dark !py-0.5"
              : "chip-soft !py-0.5"
          }
        >
          {status === "done" ? "Done" : status === "active" ? "Next" : "Locked"}
        </span>
      </div>
      <div className="mt-3 text-sm font-semibold tracking-tight text-ink-900">{name}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* Icons */
function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.7L20 10l-5 4 1.5 6L12 17l-4.5 3L9 14l-5-4 6.1-1.3z" />
    </svg>
  );
}
function FlowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="6" height="6" rx="1" />
      <rect x="16" y="15" width="6" height="6" rx="1" />
      <path d="M5 9v3a3 3 0 0 0 3 3h8" />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M9 13a4.5 4.5 0 0 0 3-4" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}
