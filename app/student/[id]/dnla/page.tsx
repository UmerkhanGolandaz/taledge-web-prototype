"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStudent, DnlaScore } from "@/lib/data";

type Msg = { role: "assistant" | "user"; content: string };

type Report = {
  dnla: DnlaScore[];
  strengths: string[];
  developmentAreas: string[];
  risks: string[];
  narrative: string;
};

type GenStatus = "idle" | "checking" | "generating" | "generated" | "error";

export default function DnlaReport() {
  const params = useParams();
  const id = String(params.id);
  const s = getStudent(id);
  if (!s) notFound();

  const seed: Report = useMemo(
    () => ({
      dnla: s.dnla,
      strengths: s.strengths,
      developmentAreas: s.developmentAreas,
      risks: s.risks,
      narrative: `${s.name} demonstrates ${s.strengths[0]?.toLowerCase() ?? "core competencies"} alongside ${s.developmentAreas[0]?.toLowerCase() ?? "growth areas"}. In a ${s.targetRole} context, the below-benchmark feedback reaction score is the highest-leverage area to address.`,
    }),
    [s]
  );

  const [report, setReport] = useState<Report>(seed);
  const [status, setStatus] = useState<GenStatus>("idle");
  const [source, setSource] = useState<string>("seed");
  const [genError, setGenError] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);

  const readTranscripts = useCallback(() => {
    try {
      const tech = localStorage.getItem(`taledge:interview:${id}:technical`);
      const behav = localStorage.getItem(`taledge:interview:${id}:behavioural`);
      return {
        technical: tech ? (JSON.parse(tech) as Msg[]) : [],
        behavioural: behav ? (JSON.parse(behav) as Msg[]) : [],
      };
    } catch {
      return { technical: [] as Msg[], behavioural: [] as Msg[] };
    }
  }, [id]);

  const generate = useCallback(async () => {
    setStatus("generating");
    setGenError("");
    const { technical, behavioural } = readTranscripts();
    try {
      const r = await fetch("/api/generate-dnla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          candidateName: s.name,
          targetRole: s.targetRole,
          resumeSummary: s.resumeSummary,
          technicalQA: technical,
          behaviouralQA: behavioural,
          seedDnla: s.dnla,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setStatus("error");
        setGenError(data?.error || "Couldn't generate the DNLA report.");
        return;
      }
      setReport({
        dnla: data.generated.dnla,
        strengths: data.generated.strengths?.length ? data.generated.strengths : seed.strengths,
        developmentAreas: data.generated.developmentAreas?.length
          ? data.generated.developmentAreas
          : seed.developmentAreas,
        risks: data.generated.risks || [],
        narrative: data.generated.narrative || seed.narrative,
      });
      setSource(data.source || "gemini-2.5-pro");
      setGeneratedAt(Date.now());
      setStatus("generated");
      try {
        localStorage.setItem(
          `taledge:dnla:${id}`,
          JSON.stringify({ report: data.generated, source: data.source, ts: Date.now() })
        );
      } catch {
        /* non-fatal */
      }
    } catch (e: any) {
      setStatus("error");
      setGenError(e?.message || "Network error while generating.");
    }
  }, [id, s, seed, readTranscripts]);

  // On mount: hydrate cached generation if any, otherwise auto-generate if responses exist.
  useEffect(() => {
    setStatus("checking");
    let hydrated = false;
    try {
      const cached = localStorage.getItem(`taledge:dnla:${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.report?.dnla) {
          // Re-merge cached generated scores into the seed structure to keep groups/benchmarks aligned.
          const generatedMap = new Map<string, { score: number; insight: string }>();
          for (const item of parsed.report.dnla) {
            generatedMap.set(String(item.competency).toLowerCase(), {
              score: Number(item.score),
              insight: String(item.insight || ""),
            });
          }
          const merged = s.dnla.map((seedItem) => {
            const gen = generatedMap.get(seedItem.competency.toLowerCase());
            return gen
              ? { ...seedItem, score: gen.score, insight: gen.insight }
              : seedItem;
          });
          setReport({
            dnla: merged,
            strengths: parsed.report.strengths?.length ? parsed.report.strengths : seed.strengths,
            developmentAreas: parsed.report.developmentAreas?.length
              ? parsed.report.developmentAreas
              : seed.developmentAreas,
            risks: parsed.report.risks || [],
            narrative: parsed.report.narrative || seed.narrative,
          });
          setSource(parsed.source || "gemini-2.5-pro");
          setGeneratedAt(parsed.ts || null);
          setStatus("generated");
          hydrated = true;
        }
      }
    } catch {
      /* fall through to auto-generate */
    }
    if (!hydrated) {
      const { technical, behavioural } = readTranscripts();
      const userAnswers =
        technical.filter((m) => m.role === "user").length +
        behavioural.filter((m) => m.role === "user").length;
      if (userAnswers > 0) {
        void generate();
      } else {
        setStatus("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const groups: Record<string, typeof report.dnla> = {};
  report.dnla.forEach((d) => {
    groups[d.group] = groups[d.group] || [];
    groups[d.group].push(d);
  });

  const overall = (
    report.dnla.reduce((a, d) => a + d.score, 0) / report.dnla.length
  ).toFixed(1);
  const benchmark = (
    report.dnla.reduce((a, d) => a + d.benchmark, 0) / report.dnla.length
  ).toFixed(1);

  // Find weakest/strongest groups dynamically
  const groupAverages = Object.entries(groups).map(([g, items]) => ({
    name: g,
    avg: items.reduce((a, d) => a + d.score, 0) / items.length,
  }));
  const strongest = groupAverages.length
    ? groupAverages.reduce((a, b) => (a.avg >= b.avg ? a : b))
    : { name: "·", avg: 0 };
  const weakest = groupAverages.length
    ? groupAverages.reduce((a, b) => (a.avg <= b.avg ? a : b))
    : { name: "·", avg: 0 };

  return (
    <div className="relative overflow-hidden">
      {/* Faint grid overlay across hero */}
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] opacity-40" />

      {/* HERO */}
      <section className="relative border-b border-ink-200 pt-8 pb-8 sm:pt-12 sm:pb-10">
        <div className="container mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="pill animate-fade-in">
              <BrainIcon /> Step 03 of 06 · DNLA Social Competence
            </div>
            <Link href={`/student/${s.id}`} className="btn-ghost !py-2 text-xs">
              <ArrowLeft /> Back
            </Link>
          </div>

          {/* Sequence rail */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
            {["Profile", "Technical", "DNLA", "Behavioural", "Fit Score", "Pathway"].map((label, i) => {
              const state = i < 2 ? "done" : i === 2 ? "active" : "todo";
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className={
                      state === "done"
                        ? "rounded-full bg-ink-900 px-2.5 py-1 text-white"
                        : state === "active"
                        ? "rounded-full border border-ink-900 bg-white px-2.5 py-1 text-ink-900"
                        : "rounded-full border border-ink-200 bg-white px-2.5 py-1 text-ink-400"
                    }
                  >
                    0{i + 1} · {label}
                  </span>
                  {i < 5 && <span className="text-ink-300">·</span>}
                </div>
              );
            })}
          </div>

          <h1 className="mt-7 max-w-4xl text-2xl font-bold tracking-tight leading-[1.1] text-ink-900 sm:text-3xl md:text-4xl">
            Behavioural DNA of {s.name.split(" ")[0]}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-ink-500 sm:text-base">
            11 competencies across 4 groups, benchmarked against top performers in{" "}
            {s.targetRole}. Licensed German psychometric engine.
          </p>
          <div className="mt-5 text-xs font-medium text-ink-500">
            Assessment ID: DNLA-SC-{s.id.toUpperCase()}-2026-0317 · Licensed via DNLA
            Germany
          </div>

          {/* Generation status banner */}
          <GenStatusBanner
            status={status}
            source={source}
            error={genError}
            generatedAt={generatedAt}
            onRegenerate={generate}
          />
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Hero summary */}
        <div className="card p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <HeroStat label="Overall score" value={overall} sub={`/${benchmark} benchmark`} />
            <HeroStat
              label="Strongest group"
              value={strongest.name}
              sub={`Avg ${strongest.avg.toFixed(1)} / 7`}
            />
            <HeroStat
              label="Weakest group"
              value={weakest.name}
              sub={`Avg ${weakest.avg.toFixed(1)} / 7`}
              tone="warn"
            />
            <HeroStat
              label="Risk flags"
              value={String(report.risks.length)}
              sub={report.risks.length ? "Action required" : "Clear"}
              tone={report.risks.length ? "danger" : "success"}
            />
          </div>
        </div>

        {/* Reading the report · DNLA standard legend */}
        <div className="mt-6 card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="label">Reading this report</div>
              <p className="mt-1.5 max-w-3xl text-sm text-ink-600">
                Each competency is scored on the DNLA 1–7 scale, with the bar shaded into
                three zones. The black line is your score; the grey marker is the
                top-performer benchmark for this role.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <LegendKey color="bg-rose-200" label="1.0 – 3.4 · Development needed" />
              <LegendKey color="bg-amber-200" label="3.5 – 4.9 · Established" />
              <LegendKey color="bg-emerald-200" label="5.0 – 7.0 · Top range" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-ink-600">
            <div className="flex items-center gap-2">
              <span className="relative inline-block h-3 w-8 rounded bg-ink-100">
                <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-ink-900" />
              </span>
              Your score
            </div>
            <div className="flex items-center gap-2">
              <span className="relative inline-block h-3 w-8 rounded bg-ink-100">
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink-400" />
              </span>
              Top-performer benchmark
            </div>
          </div>
        </div>

        {/* Groups */}
        {Object.entries(groups).map(([group, items], idx) => (
          <section key={group} className="mt-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="pill">
                  <GroupIcon /> Group 0{idx + 1}
                </div>
                <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                  {group}
                </h2>
              </div>
              <span className="chip-soft">{items.length} competencies</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((d) => (
                <DnlaCompetency key={d.competency} d={d} />
              ))}
            </div>
          </section>
        ))}

        {/* Interpretation */}
        <section className="mt-12">
          <div className="mb-6">
            <div className="pill">
              <NotebookIcon /> The Interpretation
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Contextual interpretation
            </h2>
          </div>
          <div className="card p-5 sm:p-7">
            <p className="text-base leading-relaxed text-ink-700">
              {report.narrative}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <CardCol title="Strengths" tone="success">
                {report.strengths.length ? (
                  report.strengths.map((x, i) => <li key={i}>{x}</li>)
                ) : (
                  <li>No strengths surfaced yet.</li>
                )}
              </CardCol>
              <CardCol title="Development areas" tone="warn">
                {report.developmentAreas.length ? (
                  report.developmentAreas.map((x, i) => <li key={i}>{x}</li>)
                ) : (
                  <li>No development areas surfaced yet.</li>
                )}
              </CardCol>
              <CardCol title="Behavioural risks" tone="danger">
                {report.risks.length ? (
                  report.risks.map((x, i) => <li key={i}>{x}</li>)
                ) : (
                  <li>No critical risks.</li>
                )}
              </CardCol>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-ink-200 bg-ink-50 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="label">Step 03 complete</div>
              <div className="mt-1 text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                Continue to the grounded behavioural interview
              </div>
              <p className="mt-1 max-w-2xl text-sm text-ink-500">
                Step 04 probes the DNLA-identified risks with situational scenarios.
                Low feedback reaction → stress simulation. Low assertiveness → push-back drills.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/student/${s.id}`} className="btn-ghost">
                Back to dossier
              </Link>
              <Link
                href={`/student/${s.id}/interview/behavioural`}
                className="btn-primary"
              >
                Next · Step 04 · Behavioural Interview
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenStatusBanner({
  status,
  source,
  error,
  generatedAt,
  onRegenerate,
}: {
  status: GenStatus;
  source: string;
  error: string;
  generatedAt: number | null;
  onRegenerate: () => void;
}) {
  if (status === "idle" || status === "checking") {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-ink-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-400" />
          Showing benchmark profile. Complete an interview to generate your
          personalized DNLA report via Gemini 2.5 Pro.
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="text-xs font-medium text-ink-900 underline-offset-4 hover:underline"
        >
          Generate now
        </button>
      </div>
    );
  }
  if (status === "generating") {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs text-ink-700">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink-900" />
        Generating your DNLA report with Gemini 2.5 Pro from your interview
        responses…
      </div>
    );
  }
  if (status === "generated") {
    const ago =
      generatedAt != null
        ? `${Math.max(1, Math.round((Date.now() - generatedAt) / 1000))}s ago`
        : "just now";
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-ink-800">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Personalized report generated by{" "}
          <span className="font-semibold">{source}</span> · {ago}
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="text-xs font-medium text-ink-900 underline-offset-4 hover:underline"
        >
          Regenerate
        </button>
      </div>
    );
  }
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs">
      <div className="flex items-center gap-2 text-ink-800">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
        {error}
      </div>
      <button
        type="button"
        onClick={onRegenerate}
        className="text-xs font-medium text-ink-900 underline-offset-4 hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-700">
      <span className={`inline-block h-3 w-6 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}

/* ---------- DNLA standard competency display ---------- */

function DnlaCompetency({
  d,
}: {
  d: {
    competency: string;
    group: string;
    score: number;
    benchmark: number;
    insight: string;
  };
}) {
  const scorePct = (d.score / 7) * 100;
  const benchPct = (d.benchmark / 7) * 100;

  // DNLA zones · 1-3.5 Development, 3.5-5 Established, 5-7 Top range
  // Visual zones expressed as percentage of the 1-7 axis (0% = 1, 100% = 7).
  const devEnd = ((3.5 - 1) / 6) * 100; // ≈ 41.67
  const estEnd = ((5 - 1) / 6) * 100; // ≈ 66.67

  // Note: the bar internally spans 0-100% mapping to score 0-7 for marker consistency;
  // but zone visuals use the 1-7 axis range so we offset by score=1.
  const scoreLeft = scorePct;
  const benchLeft = benchPct;

  const zone =
    d.score < 3.5
      ? { label: "Development needed", chip: "chip-danger" }
      : d.score < 5
      ? { label: "Established", chip: "chip-warn" }
      : { label: "Top range", chip: "chip-success" };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold tracking-tight text-ink-900">
            {d.competency}
          </div>
          <span className={`${zone.chip} mt-1.5`}>{zone.label}</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums tracking-tight text-ink-900">
            {d.score.toFixed(1)}
          </div>
          <div className="text-[11px] tabular-nums text-ink-500">
            top performer: {d.benchmark.toFixed(1)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {/* Bar with 3 DNLA zones */}
        <div className="relative h-4 overflow-hidden rounded-md">
          <div className="absolute inset-0 flex">
            <div
              className="h-full bg-rose-200"
              style={{ width: `${devEnd}%` }}
            />
            <div
              className="h-full bg-amber-200"
              style={{ width: `${estEnd - devEnd}%` }}
            />
            <div
              className="h-full bg-emerald-200"
              style={{ width: `${100 - estEnd}%` }}
            />
          </div>
          {/* Benchmark line (top-performer reference) */}
          <div
            className="absolute top-0 bottom-0 w-px bg-ink-400"
            style={{ left: `${benchLeft}%` }}
            aria-label={`Top performer benchmark ${d.benchmark.toFixed(1)}`}
          />
          <div
            className="absolute -top-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink-400"
            style={{ left: `${benchLeft}%` }}
          />
          {/* Candidate score marker */}
          <div
            className="absolute top-0 bottom-0 w-[3px] bg-ink-900"
            style={{ left: `calc(${scoreLeft}% - 1.5px)` }}
            aria-label={`Score ${d.score.toFixed(1)}`}
          />
          <div
            className="absolute -bottom-2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-ink-900"
            style={{ left: `${scoreLeft}%` }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[10px] font-medium tabular-nums text-ink-500">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
          <span>7</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-600">{d.insight}</p>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/50"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/50"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50/50"
      : "border-ink-200 bg-white";
  return (
    <div className={`rounded-xl border ${cls} p-4 sm:p-5`}>
      <div className="label">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-ink-500">{sub}</div>
    </div>
  );
}

function CardCol({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/40"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/40"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50/40"
      : "border-ink-200 bg-white";
  return (
    <div className={`rounded-xl border ${cls} p-5`}>
      <div className="label">{title}</div>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-700">
        {children}
      </ul>
    </div>
  );
}

/* Icons */
function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M19 12H5M11 19l-7-7 7-7" />
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
function GroupIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function NotebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6h4M2 12h4M2 18h4" />
      <rect x="6" y="3" width="16" height="18" rx="2" />
    </svg>
  );
}
