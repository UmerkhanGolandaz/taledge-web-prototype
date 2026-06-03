"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const steps = ["Profile", "Goal", "Context", "Done"];

type ParsedResume = {
  full_name?: string;
  email?: string;
  institution?: string;
  year_cohort?: string;
  target_role?: string;
  summary?: string;
  skills?: string[];
  projects?: { title: string; stack: string[]; impact: string }[];
};

type ResumeStatus = "idle" | "uploading" | "parsing" | "parsed" | "error";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [track, setTrack] = useState<"placement" | "exam" | null>(null);

  // Resume parsing state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>("idle");
  const [resumeFile, setResumeFile] = useState<{ name: string; sizeKb: number } | null>(null);
  const [resumeSource, setResumeSource] = useState<string>("");
  const [resumeError, setResumeError] = useState<string>("");
  const [parseMs, setParseMs] = useState<number>(0);

  // Profile fields (controlled · auto-fill from parsed resume)
  const [fullName, setFullName] = useState("Priya Raghavan");
  const [email, setEmail] = useState("priya.r@atherix.edu");
  const [institution, setInstitution] = useState("Atherix Institute of Tech");
  const [yearCohort, setYearCohort] = useState("Final Year · B.Tech CS");
  const [aspiration, setAspiration] = useState(
    "Become a product-minded engineer who can own full-stack features end to end."
  );
  const [selectedRole, setSelectedRole] = useState("Full-stack Software Engineer");
  const [parsedExtras, setParsedExtras] = useState<{
    skills: string[];
    projects: { title: string; stack: string[]; impact: string }[];
    summary: string;
    target_role: string;
  } | null>(null);

  async function handleFile(file: File) {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setResumeFile({ name: file.name, sizeKb: Math.round(file.size / 1024) });
      setResumeStatus("error");
      setResumeError("Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeFile({ name: file.name, sizeKb: Math.round(file.size / 1024) });
      setResumeStatus("error");
      setResumeError("File is larger than 10 MB.");
      return;
    }
    setResumeFile({ name: file.name, sizeKb: Math.round(file.size / 1024) });
    setResumeStatus("parsing");
    setResumeError("");
    setParsedExtras(null);
    const t0 = performance.now();
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/parse-resume", { method: "POST", body: fd });
      const data = await r.json();
      const elapsed = Math.round(performance.now() - t0);
      setParseMs(elapsed);

      if (!r.ok || !data.ok) {
        setResumeStatus("error");
        setResumeError(
          data?.error ||
            "We couldn't parse this PDF. Please try a different resume file."
        );
        return;
      }

      setResumeSource(data.source || "");
      const p: ParsedResume = data.parsed || {};
      if (p.full_name) setFullName(p.full_name);
      if (p.email) setEmail(p.email);
      if (p.institution) setInstitution(p.institution);
      if (p.year_cohort) setYearCohort(p.year_cohort);
      setParsedExtras({
        skills: p.skills || [],
        projects: p.projects || [],
        summary: p.summary || "",
        target_role: p.target_role || "",
      });
      setResumeStatus("parsed");
    } catch (e: any) {
      setResumeStatus("error");
      setResumeError(
        e?.message || "Network error · please check your connection and retry."
      );
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function persistDemoProfile() {
    try {
      localStorage.setItem(
        "taledge:demo-profile",
        JSON.stringify({
          fullName,
          email,
          institution,
          yearCohort,
          aspiration,
          targetRole: selectedRole,
          resumeSummary: parsedExtras?.summary || "",
          resumeSkills: parsedExtras?.skills || [],
          resumeProjects: parsedExtras?.projects || [],
        })
      );
    } catch {
      /* localStorage unavailable - non-fatal */
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Faint grid overlay across hero */}
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] opacity-40" />

      {/* HERO STRIP */}
      <section className="relative border-b border-ink-200 pt-8 pb-8 sm:pt-12 sm:pb-10">
        <div className="container mx-auto max-w-5xl px-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="pill animate-fade-in">
              <SparkIcon /> Onboarding · Track Selector
            </div>
            <Link href="/" className="btn-ghost !py-2 text-xs">
              <ArrowLeft /> All roles
            </Link>
          </div>

          <h1 className="mt-7 max-w-4xl text-2xl font-bold tracking-tight leading-[1.1] text-ink-900 sm:text-3xl md:text-4xl">
            Calibrate your Assessment
          </h1>
          <p className="mt-4 max-w-2xl text-base text-ink-500 sm:text-lg">
            Four short steps. The system reconfigures its evaluation methodology, scoring
            rubrics, and interaction model based on your answers.
          </p>

          {/* Stepper */}
          <div className="mt-10 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div
                  className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold transition ${
                    i < step
                      ? "bg-ink-900 text-white"
                      : i === step
                      ? "border-2 border-ink-900 text-ink-900"
                      : "border border-ink-200 text-ink-400"
                  }`}
                >
                  {i < step ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`font-medium ${i === step ? "text-ink-900" : "text-ink-500"}`}>
                  {s}
                </span>
                {i < steps.length - 1 && <span className="text-ink-300">·</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CARD CONTENT */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto max-w-3xl px-5 sm:px-6">
          <div className="card p-5 sm:p-8">
            {step === 0 && (
              <div className="animate-fade-in">
                <div className="pill">
                  <UserIcon /> Step 01 · Profile
                </div>
                <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                  Tell us about yourself
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Your profile shapes the assessment. Private until you choose to share.
                </p>

                {/* Resume Upload · Gemini 2.5 Pro */}
                <div className="mt-6">
                  <label className="label flex items-center justify-between">
                    <span>Upload resume · auto-fills your profile</span>
                    <span className="text-[10px] font-medium normal-case tracking-normal text-ink-400">
                      Parsed by Gemini 2.5 Pro · via OpenRouter
                    </span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={onFileChange}
                    className="hidden"
                  />

                  {resumeStatus === "idle" && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={onDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50 px-4 py-5 transition hover:border-ink-900 hover:bg-white"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="grid h-11 w-11 place-items-center rounded-lg border border-ink-200 bg-white text-ink-900">
                        <DocIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink-900">
                          Drop your resume PDF here, or click to upload
                        </div>
                        <div className="text-xs text-ink-500">
                          Max 10 MB · We&apos;ll auto-populate the fields above
                        </div>
                      </div>
                      <span className="chip-soft shrink-0">Choose file</span>
                    </div>
                  )}

                  {resumeStatus === "parsing" && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-4">
                      <div className="grid h-11 w-11 place-items-center rounded-lg border border-ink-200 bg-ink-50 text-ink-900">
                        <DocIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {resumeFile?.name}
                        </div>
                        <div className="text-xs text-ink-500">
                          {resumeFile?.sizeKb} KB · Parsing with Gemini 2.5 Pro…
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-700">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink-900" />
                        Parsing
                      </span>
                    </div>
                  )}

                  {resumeStatus === "parsed" && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-4">
                      <div className="grid h-11 w-11 place-items-center rounded-lg border border-emerald-200 bg-white text-ink-900">
                        <DocIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {resumeFile?.name}
                        </div>
                        <div className="text-xs text-ink-500">
                          {resumeFile?.sizeKb} KB · parsed in {(parseMs / 1000).toFixed(1)}s
                          {resumeSource && (
                            <span className="ml-1 text-ink-400">· {resumeSource}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-medium text-ink-700 underline-offset-4 hover:underline"
                      >
                        Replace
                      </button>
                      <span className="chip-success shrink-0">Parsed</span>
                    </div>
                  )}

                  {resumeStatus === "error" && (
                    <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-rose-200 bg-white text-base font-bold text-rose-600">
                          !
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-ink-900">
                            {resumeFile?.name
                              ? `"${resumeFile.name}" isn't a valid resume`
                              : "Couldn't parse this file"}
                          </div>
                          <div className="mt-1 text-xs text-ink-600">{resumeError}</div>
                          <div className="mt-2 text-[11px] text-ink-500">
                            Upload a resume PDF (CV / candidate profile) · Gemini will
                            auto-fill your profile.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResumeStatus("idle");
                            setResumeFile(null);
                            setResumeError("");
                            fileInputRef.current?.click();
                          }}
                          className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Full name"
                    value={fullName}
                    onChange={setFullName}
                    autoFilled={resumeStatus === "parsed"}
                  />
                  <Field
                    label="Email"
                    value={email}
                    onChange={setEmail}
                    autoFilled={resumeStatus === "parsed"}
                  />
                  <Field
                    label="Institution"
                    value={institution}
                    onChange={setInstitution}
                    autoFilled={resumeStatus === "parsed"}
                  />
                  <Field
                    label="Year / Cohort"
                    value={yearCohort}
                    onChange={setYearCohort}
                    autoFilled={resumeStatus === "parsed"}
                  />
                </div>
                <div className="mt-4">
                  <label className="label">Career aspiration</label>
                  <textarea
                    value={aspiration}
                    onChange={(e) => setAspiration(e.target.value)}
                    rows={3}
                    className="input mt-1.5 resize-none"
                    placeholder="What kind of work and growth are you aiming for?"
                  />
                </div>

                {/* Parsed preview */}
                {resumeStatus === "parsed" && parsedExtras && (parsedExtras.skills.length > 0 || parsedExtras.projects.length > 0) && (
                  <div className="mt-5 rounded-xl border border-ink-200 bg-white p-4">
                    <div className="label">Extracted from resume</div>
                    {parsedExtras.target_role && (
                      <div className="mt-2 text-sm">
                        <span className="text-ink-500">Target role · </span>
                        <span className="font-medium text-ink-900">
                          {parsedExtras.target_role}
                        </span>
                      </div>
                    )}
                    {parsedExtras.summary && (
                      <p className="mt-2 text-sm text-ink-600">{parsedExtras.summary}</p>
                    )}
                    {parsedExtras.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {parsedExtras.skills.slice(0, 12).map((s) => (
                          <span key={s} className="chip">{s}</span>
                        ))}
                      </div>
                    )}
                    {parsedExtras.projects.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {parsedExtras.projects.slice(0, 3).map((p, i) => (
                          <div key={i} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                            <div className="text-sm font-semibold text-ink-900">{p.title}</div>
                            {p.stack?.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {p.stack.slice(0, 6).map((t) => (
                                  <span key={t} className="text-[10px] font-medium text-ink-500">
                                    {t}
                                  </span>
                                )).reduce((acc: React.ReactNode[], el, idx) => acc.concat(idx > 0 ? [<span key={`sep-${idx}`} className="text-[10px] text-ink-300">·</span>, el] : [el]), [])}
                              </div>
                            )}
                            {p.impact && (
                              <div className="mt-1 text-xs text-ink-500">{p.impact}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <button onClick={() => setStep(1)} className="btn-primary">
                    Continue
                    <ArrowRight />
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="animate-fade-in">
                <div className="pill">
                  <TargetIcon /> Step 02 · Goal
                </div>
                <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                  What kind of success are you after?
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  This is the critical branching point. The system reconfigures based on
                  your answer.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Choice
                    active={track === "placement"}
                    onClick={() => setTrack("placement")}
                    tag="Track 01"
                    title="Placement & Career Success"
                    desc="Preparing for jobs, interviews, and the transition from education to employment."
                    icon={<BriefcaseIcon />}
                  />
                  <Choice
                    active={track === "exam"}
                    onClick={() => setTrack("exam")}
                    tag="Track 02"
                    title="Competitive Exam Success"
                    desc="Preparing for high-stakes exams (UPSC / GATE / GMAT) over months or years."
                    icon={<BookIcon />}
                  />
                </div>

                <div className="mt-8 flex flex-wrap justify-between gap-2">
                  <button onClick={() => setStep(0)} className="btn-ghost">
                    <ArrowLeft /> Back
                  </button>
                  <button
                    disabled={!track}
                    onClick={() => setStep(2)}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue
                    <ArrowRight />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && track === "placement" && (
              <div className="animate-fade-in">
                <div className="pill">
                  <BriefcaseIcon /> Step 03 · Role Context
                </div>
                <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                  Which role are you targeting?
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  The role grounds your interview questions, DNLA benchmarks, and Fit Score
                  weighting.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    "Full-stack Software Engineer",
                    "Backend Engineer",
                    "Frontend Engineer",
                    "Data / ML Engineer",
                    "Product Manager",
                    "Consultant · Strategy",
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition ${
                        selectedRole === r
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-900 hover:border-ink-900"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="btn-ghost">
                    <ArrowLeft /> Back
                  </button>
                  <button onClick={() => setStep(3)} className="btn-primary">
                    Continue
                    <ArrowRight />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && track === "exam" && (
              <div className="animate-fade-in">
                <div className="pill">
                  <BookIcon /> Step 03 · Exam Context
                </div>
                <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                  Which exam are you preparing for?
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Your exam selection wires in the right success benchmarks, mock-test cadence,
                  and longitudinal trackers.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {["UPSC Civil Services", "GATE · CSE", "CAT", "GMAT", "GRE", "Other"].map((r, i) => (
                    <button
                      key={r}
                      className={`rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition ${
                        i === 0
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-900 hover:border-ink-900"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="btn-ghost">
                    <ArrowLeft /> Back
                  </button>
                  <button onClick={() => setStep(3)} className="btn-primary">
                    Continue
                    <ArrowRight />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-ink-900 text-white">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </div>
                <div className="mt-6 pill mx-auto">
                  <SparkIcon /> Calibration complete
                </div>
                <h2 className="mt-5 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                  Routed into {track === "exam" ? "Track 02" : "Track 01"}
                </h2>
                <p className="mt-3 text-sm text-ink-500 sm:text-base">
                  {track === "exam"
                    ? "Competitive Exam Success · longitudinal tracking + resilience monitoring."
                    : "Placement & Career Success · DNLA + AI interviews + Fit Score."}
                </p>
                <p className="mx-auto mt-2 max-w-md text-xs text-ink-500">
                  The platform has configured your evaluation methodology and interaction
                  model.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  <Link
                    href={
                      track === "exam"
                        ? "/exam/anjali"
                        : "/student/priya/interview/technical"
                    }
                    className="btn-primary"
                    onClick={persistDemoProfile}
                  >
                    {track === "exam"
                      ? "Begin Track 02 · DNLA Success Factor"
                      : "Begin Step 02 · Technical Interview"}
                    <ArrowRight />
                  </Link>
                  <Link href="/student/priya" className="btn-ghost">
                    Skip to dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  autoFilled = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  autoFilled?: boolean;
}) {
  return (
    <div>
      <label className="label flex items-center justify-between">
        <span>{label}</span>
        {autoFilled && (
          <span className="text-[9px] font-medium normal-case tracking-normal text-emerald-700">
            Auto-filled
          </span>
        )}
      </label>
      <input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`input mt-1.5 ${autoFilled ? "border-emerald-300" : ""}`}
      />
    </div>
  );
}

function Choice({
  active,
  onClick,
  tag,
  title,
  desc,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  tag: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border p-5 transition ${
        active
          ? "border-ink-900 bg-ink-50 ring-1 ring-ink-900"
          : "border-ink-200 bg-white hover:border-ink-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-ink-200 bg-ink-50 text-ink-900">
          {icon}
        </div>
        <span className="label">{tag}</span>
      </div>
      <div className="mt-5 text-lg font-bold tracking-tight text-ink-900">{title}</div>
      <div className="mt-1.5 text-sm leading-relaxed text-ink-500">{desc}</div>
    </button>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M19 12H5M11 19l-7-7 7-7" />
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
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}
