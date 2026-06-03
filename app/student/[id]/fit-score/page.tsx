"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScoreRing, Bar } from "@/components/score-ring";
import { getStudent } from "@/lib/data";

type Msg = { role: "assistant" | "user"; content: string };
type Row = [string, number];
type RubricGroup = { group: string; rows: Row[] };
type CrossFlag = { label: string; verdict: string; tone: "ok" | "warn" | "danger" };

type GenReport = {
  technical_score: number;
  behavioural_score: number;
  fit_score: number;
  success_probability: number;
  verdict: string;
  narrative: string;
  technical_breakdown: RubricGroup[];
  resume_breakdown: RubricGroup[];
  behavioural_breakdown: RubricGroup[];
  cross_flags: CrossFlag[];
};

type GenStatus = "idle" | "checking" | "generating" | "generated" | "error";

export default function FitScorePage() {
  const params = useParams();
  const id = String(params.id);
  const s = getStudent(id);
  if (!s) notFound();

  // Sub-scores derived from the candidate's existing fit + dnla profile (used as the seed
  // until the live Gemini-generated report arrives).
  const t = s.fit.technical;
  const b = s.fit.behavioural;

  const seedTechSub: RubricGroup[] = [
    { group: "Accuracy & Coverage", rows: [
      ["Tech accuracy score", Math.round(t + 0)],
      ["Difficulty-weighted accuracy", Math.round(t - 6)],
    ]},
    { group: "Problem-solving depth", rows: [
      ["Solution correctness", Math.round(t - 2)],
      ["Approach structure", Math.round(t - 4)],
      ["Multi-approach capability", Math.round(t - 19)],
    ]},
    { group: "Thinking quality", rows: [
      ["Reasoning clarity", Math.round(t + 2)],
      ["Conceptual correctness", Math.round(t + 0)],
      ["Error recovery", Math.round(t - 12)],
    ]},
    { group: "Coding", rows: [
      ["Code correctness", Math.round(t + 4)],
      ["Code efficiency", Math.round(t - 5)],
      ["Code readability", Math.round(t - 2)],
    ]},
    { group: "Behavioural signals during tech", rows: [
      ["Response latency", Math.round(t + 7)],
      ["Latency variance", Math.round(t - 8)],
      ["Hint dependency (lower = better)", Math.round(t + 4)],
      ["Consistency", Math.round(t - 2)],
    ]},
  ];

  const seedResumeSub: RubricGroup[] = [
    { group: "Skill matching", rows: [
      ["Skill match score (vs JD)", 88],
      ["Core skill percentage", 84],
    ]},
    { group: "Project quality", rows: [
      ["Project relevance", 86],
      ["Project complexity", 82],
      ["Project impact", 78],
    ]},
    { group: "Academic signals", rows: [
      ["Academic consistency", Math.round(s.cgpa * 10)],
      ["Education tier", 76],
    ]},
    { group: "Resume quality", rows: [
      ["Resume clarity", 90],
      ["Resume specificity", 82],
    ]},
  ];

  const seedBehavSub: RubricGroup[] = [
    { group: "Communication", rows: [
      ["Communication clarity", Math.round(b + 6)],
      ["Structured answer (STAR)", Math.round(b - 4)],
      ["Verbosity (calibrated)", Math.round(b + 14)],
    ]},
    { group: "Content quality", rows: [
      ["Relevance to question", Math.round(b + 12)],
      ["Specificity (vs general)", Math.round(b + 8)],
      ["Impact orientation", Math.round(b + 10)],
    ]},
    { group: "Ownership & attitude", rows: [
      ["Ownership score", Math.round(b + 16)],
      ["Blame vs accountability", Math.round(b + 14)],
    ]},
    { group: "Consistency", rows: [
      ["Resume alignment", 88],
      ["Internal consistency", 82],
    ]},
    { group: "Cultural fit indicators", rows: [
      ["Collaboration signal", Math.round(b + 20)],
      ["Initiative score", Math.round(b + 18)],
      ["Ethical alignment", 92],
    ]},
  ];

  const dnlaByGroup = s.dnla.reduce<Record<string, typeof s.dnla>>((acc, d) => {
    acc[d.group] = acc[d.group] || [];
    acc[d.group].push(d);
    return acc;
  }, {});

  // Seed cross-component flags (PRD §9.5) · replaced by Gemini-generated when available.
  const seedCrossFlags: CrossFlag[] = [
    {
      label: "Tech vs Resume gap",
      verdict: t >= 75 ? "Aligned · claims supported by performance" : "Possible gap detected",
      tone: t >= 75 ? "ok" : "warn",
    },
    {
      label: "Confidence vs Accuracy gap",
      verdict:
        s.id === "kabir"
          ? "Overconfidence flag · high self-confidence (6.6/7) vs accuracy"
          : "Calibrated · confidence aligned with accuracy",
      tone: s.id === "kabir" ? "danger" : "ok",
    },
    {
      label: "Behaviours vs Psychometric alignment",
      verdict:
        s.risks.length === 0
          ? "Aligned · actions match claimed personality"
          : "Partial misalignment · see DNLA risk flags",
      tone: s.risks.length === 0 ? "ok" : "warn",
    },
  ];

  const seedReport: GenReport = useMemo(
    () => ({
      technical_score: s.fit.technical,
      behavioural_score: s.fit.behavioural,
      fit_score: s.fit.fit,
      success_probability: s.fit.successProbability,
      verdict: s.fit.fit >= 70 ? "Interview-ready" : "Develop further",
      narrative: `${s.name.split(" ")[0]}'s benchmark profile shows a ${s.fit.fit >= 70 ? "strong" : "developing"} composite Fit Score. Generate a personalized report from your actual interview responses to get scores grounded in your own evidence.`,
      technical_breakdown: seedTechSub,
      resume_breakdown: seedResumeSub,
      behavioural_breakdown: seedBehavSub,
      cross_flags: seedCrossFlags,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s]
  );

  const [report, setReport] = useState<GenReport>(seedReport);
  const [status, setStatus] = useState<GenStatus>("idle");
  const [source, setSource] = useState<string>("seed");
  const [genError, setGenError] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);

  const readTranscripts = useCallback(() => {
    try {
      const tech = localStorage.getItem(`taledge:interview:${id}:technical`);
      const behav = localStorage.getItem(`taledge:interview:${id}:behavioural`);
      const dnlaCache = localStorage.getItem(`taledge:dnla:${id}`);
      return {
        technical: tech ? (JSON.parse(tech) as Msg[]) : [],
        behavioural: behav ? (JSON.parse(behav) as Msg[]) : [],
        dnla: dnlaCache ? JSON.parse(dnlaCache).report : null,
      };
    } catch {
      return { technical: [] as Msg[], behavioural: [] as Msg[], dnla: null };
    }
  }, [id]);

  const readDemoProfile = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem("taledge:demo-profile") || "{}");
    } catch {
      return {};
    }
  }, []);

  const generate = useCallback(async () => {
    setStatus("generating");
    setGenError("");
    const { technical, behavioural, dnla } = readTranscripts();
    const profile = readDemoProfile();
    try {
      const r = await fetch("/api/generate-fit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          candidateName: profile.fullName || s.name,
          targetRole: profile.targetRole || s.targetRole,
          resumeSummary: [
            profile.resumeSummary || s.resumeSummary,
            profile.aspiration ? `Career aspiration: ${profile.aspiration}` : "",
          ].filter(Boolean).join("\n"),
          resumeSkills: profile.resumeSkills?.length ? profile.resumeSkills : s.skills,
          resumeProjects: profile.resumeProjects?.length ? profile.resumeProjects : s.projects,
          technicalQA: technical,
          behaviouralQA: behavioural,
          dnla: dnla?.dnla || s.dnla,
          dnlaStrengths: dnla?.strengths || s.strengths,
          dnlaDevelopmentAreas: dnla?.developmentAreas || s.developmentAreas,
          dnlaRisks: dnla?.risks || s.risks,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setStatus("error");
        setGenError(data?.error || "Couldn't generate the report.");
        return;
      }
      setReport(data.generated);
      setSource(data.source || "gemini-2.5-pro");
      setGeneratedAt(Date.now());
      setStatus("generated");
      try {
        localStorage.setItem(
          `taledge:fit-score:${id}`,
          JSON.stringify({ report: data.generated, source: data.source, ts: Date.now() })
        );
      } catch {
        /* non-fatal */
      }
    } catch (e: any) {
      setStatus("error");
      setGenError(e?.message || "Network error while generating.");
    }
  }, [id, s, readTranscripts, readDemoProfile]);

  useEffect(() => {
    setStatus("checking");
    let hydrated = false;
    try {
      const cached = localStorage.getItem(`taledge:fit-score:${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.report?.fit_score != null) {
          setReport(parsed.report);
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

  return (
    <div className="relative overflow-hidden">
      {/* Faint grid overlay across hero */}
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] opacity-40" />

      {/* HERO */}
      <section className="relative border-b border-ink-200 pt-8 pb-8 sm:pt-12 sm:pb-10">
        <div className="container mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="pill animate-fade-in">
              <ScoreIcon /> Step 05 of 06 · Fit Score & Success Probability
            </div>
            <Link href={`/student/${s.id}`} className="btn-ghost !py-2 text-xs">
              <ArrowLeft /> Back
            </Link>
          </div>

          {/* Sequence rail */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
            {["Profile", "Technical", "DNLA", "Behavioural", "Fit Score", "Pathway"].map((label, i) => {
              const state = i < 4 ? "done" : i === 4 ? "active" : "todo";
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
            Structured feedback report for {s.name.split(" ")[0]}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-ink-500 sm:text-base">
            Composite Fit Score synthesized from technical interview, DNLA, behavioural
            interview, resume signals, and cross-component checks. Per PRD §9 rubric.
          </p>

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
        {/* HEADLINE NUMBERS */}
        <div className="card p-5 sm:p-7">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            <div className="flex justify-center lg:col-span-3">
              <ScoreRing
                value={report.success_probability}
                size={188}
                stroke={14}
                label="Success Probability"
                sub={`Fit Score · ${report.fit_score}`}
                tone="dark"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:col-span-6 sm:grid-cols-3">
              <HeadlineStat label="Technical Score" value={report.technical_score} hint="Tech interview + coding" />
              <HeadlineStat label="Behavioural Score" value={report.behavioural_score} hint="DNLA + behav interview" />
              <HeadlineStat label="Fit Score" value={report.fit_score} hint="Weighted composite" />
              <HeadlineStat label="Success Probability" value={`${report.success_probability}%`} hint="Likelihood of placement success" />
              <HeadlineStat label="Risk flags" value={report.cross_flags.filter(f => f.tone !== "ok").length} hint={report.cross_flags.some(f => f.tone === "danger") ? "Action required" : "Watch list"} tone={report.cross_flags.some(f => f.tone === "danger") ? "warn" : "ok"} />
              <HeadlineStat label="Verdict" value={report.verdict} hint={`Threshold ${report.fit_score >= 70 ? "met" : "below 70"}`} tone={report.fit_score >= 70 ? "ok" : "warn"} />
            </div>
            <div className="space-y-2 lg:col-span-3">
              <button className="btn-primary w-full">
                Publish to empanelled recruiters
                <ArrowRight />
              </button>
              <Link
                href={`/student/${s.id}/interview/technical`}
                className="btn-ghost w-full"
              >
                Reattempt the assessment
              </Link>
              <Link
                href={`/student/${s.id}/development`}
                className="btn-ghost w-full"
              >
                Continue to Development Pathway
              </Link>
            </div>
          </div>
        </div>

        {/* Narrative summary */}
        {report.narrative && (
          <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50 p-5 sm:p-7">
            <div className="label">Executive summary</div>
            <p className="mt-3 text-base leading-relaxed text-ink-800">
              {report.narrative}
            </p>
          </div>
        )}

        {/* COMPONENT 1 · TECHNICAL INTERVIEW */}
        <RubricSection
          tag="Component 01"
          title="Technical Interview features"
          desc="Per PRD §9.1 · accuracy, depth, thinking quality, coding, and behavioural signals during the tech interview."
          score={report.technical_score}
          groups={report.technical_breakdown.length ? report.technical_breakdown : seedTechSub}
        />

        {/* COMPONENT 2 · RESUME / PROFILE */}
        <RubricSection
          tag="Component 02"
          title="Resume & profile features"
          desc="Per PRD §9.2 · skill matching against the JD, project quality, academic signals, and resume quality."
          score={86}
          groups={report.resume_breakdown.length ? report.resume_breakdown : seedResumeSub}
        />

        {/* COMPONENT 3 · DNLA */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="pill">
                <BrainIcon /> Component 03
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                DNLA Social Competence
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-500">
                Per PRD §9.3 · 11 competencies grouped under Achievement Dynamics,
                Interpersonal Relations, Will to Succeed, and Stress Capacity.
              </p>
            </div>
            <Link href={`/student/${s.id}/dnla`} className="btn-ghost !py-2 text-xs">
              View full DNLA report
              <ArrowRight />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(dnlaByGroup).map(([group, items]) => {
              const avg = items.reduce((a, d) => a + d.score, 0) / items.length;
              const benchAvg = items.reduce((a, d) => a + d.benchmark, 0) / items.length;
              return (
                <div key={group} className="card p-5">
                  <div className="label">{group}</div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-2xl font-bold tracking-tight text-ink-900">
                      {avg.toFixed(1)}
                    </span>
                    <span className="mb-1 text-xs text-ink-500">/{benchAvg.toFixed(1)} benchmark</span>
                  </div>
                  <Bar value={(avg / 7) * 100} tone={avg >= benchAvg ? "success" : avg >= benchAvg - 0.7 ? "warn" : "danger"} />
                  <ul className="mt-3 space-y-1.5 text-xs text-ink-600">
                    {items.slice(0, 3).map((d) => (
                      <li key={d.competency} className="flex items-center justify-between">
                        <span>{d.competency}</span>
                        <span className="tabular-nums">{d.score.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* COMPONENT 4 · BEHAVIOURAL INTERVIEW */}
        <RubricSection
          tag="Component 04"
          title="Behavioural Interview features"
          desc="Per PRD §9.4 · communication, content quality, ownership, consistency checks, and cultural fit indicators."
          score={report.behavioural_score}
          groups={report.behavioural_breakdown.length ? report.behavioural_breakdown : seedBehavSub}
        />

        {/* COMPONENT 5 · CROSS COMPONENT FLAGS */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="pill">
                <FlagIcon /> Component 05
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                Cross-component features
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-500">
                Per PRD §9.5 · gap analysis between resume claims and tech performance,
                confidence vs accuracy, and behaviour vs psychometric alignment.
              </p>
            </div>
          </div>
          <div className="card overflow-x-auto p-0">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-12 border-b border-ink-200 bg-ink-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                <div className="col-span-4">Check</div>
                <div className="col-span-6">Verdict</div>
                <div className="col-span-2 text-right">Signal</div>
              </div>
              {(report.cross_flags.length ? report.cross_flags : seedCrossFlags).map((f) => (
                <div
                  key={f.label}
                  className="grid grid-cols-12 items-center border-b border-ink-100 px-5 py-3.5 text-sm last:border-0"
                >
                  <div className="col-span-4 font-medium text-ink-900">{f.label}</div>
                  <div className="col-span-6 text-ink-700">{f.verdict}</div>
                  <div className="col-span-2 text-right">
                    <span
                      className={
                        f.tone === "ok" ? "chip-success" : f.tone === "warn" ? "chip-warn" : "chip-danger"
                      }
                    >
                      {f.tone === "ok" ? "All clear" : f.tone === "warn" ? "Watch" : "Red flag"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PUBLISH OR REATTEMPT */}
        <section className="mt-12">
          <div className="card p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl">
                <div className="label">Decision point · Per PRD §4.3</div>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                  Publish your Fit Score or reattempt the assessment
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Publishing makes your score visible to all empanelled organizations
                  through the recruiter portal. Reattempting resets the assessment so you
                  can improve your score after a coaching sprint.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/student/${s.id}/interview/technical`}
                  className="btn-ghost"
                >
                  Reattempt
                </Link>
                <button className="btn-primary">
                  Publish to recruiters
                  <ArrowRight />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* NEXT STEP */}
        <section className="mt-12">
          <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="label">Step 05 complete</div>
                <div className="mt-1 text-lg font-bold tracking-tight text-ink-900 sm:text-xl">
                  Continue to your personalized Development Pathway
                </div>
                <p className="mt-1 max-w-2xl text-sm text-ink-500">
                  Step 06 translates these scores into a 6-week coach-matched sprint plan
                  with role-pivot pathways and longitudinal tracking.
                </p>
              </div>
              <Link
                href={`/student/${s.id}/development`}
                className="btn-primary"
              >
                Next · Step 06 · Development Pathway
                <ArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ----- Generation status banner ----- */

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
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-ink-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-400" />
          Showing benchmark profile. Complete an interview, then return here to
          generate your personalized Fit Score report via Gemini 2.5 Pro.
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
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs text-ink-700">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink-900" />
        Synthesizing your final report with Gemini 2.5 Pro across all
        components…
      </div>
    );
  }
  if (status === "generated") {
    const ago =
      generatedAt != null
        ? `${Math.max(1, Math.round((Date.now() - generatedAt) / 1000))}s ago`
        : "just now";
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-ink-800">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Personalized Fit Score report generated by{" "}
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
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs">
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

/* ----- Rubric section helper ----- */

function RubricSection({
  tag,
  title,
  desc,
  score,
  groups,
}: {
  tag: string;
  title: string;
  desc: string;
  score: number;
  groups: { group: string; rows: (string | number)[][] }[];
}) {
  return (
    <section className="mt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="pill">
            <CheckCircle /> {tag}
          </div>
          <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">{desc}</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Component score
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{score}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <div key={g.group} className="card p-5">
            <div className="label">{g.group}</div>
            <div className="mt-3 space-y-2.5">
              {g.rows.map(([label, value]) => {
                const v = Math.max(0, Math.min(100, Number(value)));
                return (
                  <div key={String(label)}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-700">{label}</span>
                      <span className="tabular-nums font-semibold text-ink-900">{v}</span>
                    </div>
                    <Bar
                      value={v}
                      tone={v >= 75 ? "success" : v >= 55 ? "dark" : "warn"}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----- Headline stat ----- */

function HeadlineStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "default" | "ok" | "warn";
}) {
  const accent =
    tone === "ok"
      ? "border-emerald-200"
      : tone === "warn"
      ? "border-amber-200"
      : "border-ink-200";
  return (
    <div className={`rounded-xl border ${accent} bg-white p-4`}>
      <div className="label">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink-900">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-ink-500">{hint}</div>
    </div>
  );
}

/* ----- Icons ----- */

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M19 12H5M11 19l-7-7 7-7" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function ScoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5z" />
    </svg>
  );
}
function CheckCircle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M9 13a4.5 4.5 0 0 0 3-4"/>
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
