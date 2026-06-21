"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Logo } from "@/components/logo";
import { postAuthPath, type Role } from "@/lib/roles";
import {
  EASE,
  FONT,
  BrandPanel,
  EntField,
  MailIcon,
  LockIcon,
  PasswordToggle,
  Spinner,
  Arrow,
} from "@/components/landing/enterprise/auth-kit";

/* ------------------------------- data ----------------------------- */

const STEPS = ["Welcome", "Platform", "Organization", "Assessments", "Done"];

const INDUSTRIES = ["Technology", "Education", "Financial Services", "Healthcare", "Manufacturing", "Public Sector"];
const TEAM_SIZES = ["1–50", "51–200", "201–1,000", "1,000+"];
const HIRING_VOLUMES = ["Under 10 / year", "10–100 / year", "100–1,000 / year", "1,000+ / year"];

// Enterprise personas shown to the buyer, each mapped to a real backend role so
// post-auth routing and the role-aware workspace stay intact.
const PLATFORM_ROLES: { key: string; label: string; desc: string; role: Role; path: string }[] = [
  { key: "recruiter", label: "Recruiter", desc: "Source, assess and shortlist on verified evidence.", role: "recruiter", path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01" },
  { key: "university", label: "University", desc: "Make whole cohorts interview-ready with readiness heatmaps.", role: "institute", path: "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c0 1 3 3 6 3s6-2 6-3v-5" },
  { key: "candidate", label: "Candidate", desc: "Get assessed by AI, earn a Fit Score, and follow a coaching pathway.", role: "candidate", path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" },
];

const ASSESSMENTS = [
  { key: "technical", label: "Technical assessments", desc: "Proctored, adaptive technical interviews — transcribed and rubric-scored.", path: "M16 18 22 12 16 6M8 6 2 12l6 6" },
  { key: "interview", label: "Interview workflows", desc: "Sequenced technical + behavioural rounds run by a live voice agent.", path: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2" },
  { key: "evaluation", label: "Evaluation templates", desc: "Structured rubrics so every candidate is scored consistently.", path: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { key: "pipelines", label: "Candidate pipelines", desc: "Role-matched, verified candidates published to recruiters on consent.", path: "M3 3v18h18M8 17V9M13 17V5M18 17v-6" },
];

/* ----------------------------- primitives ------------------------- */

function OptionCard({
  selected,
  onClick,
  title,
  desc,
  path,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  path?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "group relative flex w-full items-start gap-3 rounded-xl border bg-white text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0057FF]/12 " +
        (compact ? "p-3.5 " : "p-4 ") +
        (selected
          ? "border-[#0057FF] shadow-[0_14px_36px_-22px_rgba(0,87,255,0.6)] ring-1 ring-[#0057FF]"
          : "border-slate-200 hover:border-[#0057FF]/40 hover:shadow-sm")
      }
    >
      {path && (
        <span
          className={
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors " +
            (selected ? "bg-[#0057FF] text-white" : "bg-[#0057FF]/[0.07] text-[#0057FF] group-hover:bg-[#0057FF]/10")
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={path} />
          </svg>
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-[#081A3A]">{title}</span>
        {desc && <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{desc}</span>}
      </span>
      <span
        aria-hidden
        className={
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all " +
          (selected ? "border-[#0057FF] bg-[#0057FF] text-white" : "border-slate-300 text-transparent")
        }
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      </span>
    </button>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "rounded-lg border px-4 py-3 text-[14px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0057FF]/12 " +
        (selected
          ? "border-[#0057FF] bg-[#0057FF]/[0.06] text-[#0057FF] ring-1 ring-[#0057FF]"
          : "border-slate-200 bg-white text-slate-600 hover:border-[#0057FF]/40 hover:text-[#081A3A]")
      }
    >
      {children}
    </button>
  );
}

function StepHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0057FF]">{kicker}</p>
      <h1 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.02em] text-[#081A3A] sm:text-[2rem]">{title}</h1>
      {sub && <p className="mt-2 text-[14.5px] leading-relaxed text-slate-500">{sub}</p>}
    </div>
  );
}

/* ------------------------------- page ----------------------------- */

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // organization
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [hiringVolume, setHiringVolume] = useState("");
  // platform + assessments
  const [platformRole, setPlatformRole] = useState("");
  const [prefs, setPrefs] = useState<string[]>(ASSESSMENTS.map((a) => a.key));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isCandidate = platformRole === "candidate";
  // Step order: 0 Welcome · 1 Platform · 2 Organization · 3 Assessments.
  const stepValid = [
    name.trim().length > 1 && emailValid && password.length >= 6,
    !!platformRole,
    orgName.trim().length > 1 && !!industry && !!teamSize && !!hiringVolume,
    prefs.length > 0,
  ];
  // Candidates have no organization, so step 2 is skipped for them.
  const flow = isCandidate ? [0, 1, 3] : [0, 1, 2, 3];
  const total = flow.length;
  const pos = Math.max(0, flow.indexOf(step)) + 1;
  const nextOf = (s: number) => (s === 1 && isCandidate ? 3 : s + 1);
  const prevOf = (s: number) => (s === 3 && isCandidate ? 1 : s - 1);
  const stepErrors = [
    "Enter your full name, a valid work email, and a password with at least 6 characters.",
    "Select how you'll use Taledge.",
    "Add your organization name and choose an industry, team size and hiring volume.",
    "Select at least one assessment module.",
  ];

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setError("");
    setStep(next);
  };

  const togglePref = (key: string) =>
    setPrefs((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const selectedRole = PLATFORM_ROLES.find((r) => r.key === platformRole);

  const createAccount = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const role: Role = selectedRole?.role ?? "recruiter";
      try {
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, "users", uid), {
          uid,
          email,
          name,
          role,
          published: false,
          organization: {
            name: orgName,
            industry,
            teamSize,
            hiringVolume,
            persona: platformRole,
          },
          assessmentPreferences: prefs,
          createdAt: new Date().toISOString(),
        });
      } catch {
        /* profile persistence is best-effort in demo */
      }
      go(4); // success screen
    } catch (err: any) {
      const code = err?.code || "";
      setError(
        code === "auth/email-already-in-use"
          ? "That email is already registered. Try signing in instead."
          : code === "auth/invalid-email"
          ? "Please enter a valid work email."
          : code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : err?.message || "Could not create your account."
      );
      go(0); // send them back to fix credentials
    } finally {
      setLoading(false);
    }
  };

  const launchDashboard = () => {
    const role = selectedRole?.role ?? "recruiter";
    // A brand-new candidate starts the assessment funnel; orgs go to the hub.
    router.push(role === "candidate" ? "/onboarding" : postAuthPath(role));
  };

  const isSuccess = step === 4;

  return (
    <div style={{ fontFamily: FONT }} className="grid min-h-screen bg-white text-[#081A3A] antialiased lg:grid-cols-[1.05fr_1fr]">
      {/* Left — editorial enterprise panel (sticky, full height) */}
      <div className="lg:sticky lg:top-0 lg:h-screen">
        <BrandPanel
          heading="Build your talent workflow."
          sub="Set up assessments, recruiter pipelines and analytics in minutes — the enterprise platform that turns candidate potential into one defensible score."
        />
      </div>

      {/* Right — onboarding */}
      <div className="relative flex min-h-screen flex-col">
        {/* top bar */}
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Taledge home" className="inline-flex lg:hidden"><Logo /></Link>
          <span aria-hidden className="hidden lg:block" />
          {!isSuccess && (
            <p className="text-[14px] text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#0057FF] hover:underline">Sign in</Link>
            </p>
          )}
        </header>

        <main className="mx-auto w-full max-w-xl px-5 pb-20 pt-4 sm:px-8">
        {/* progress */}
        {!isSuccess && (
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {flow.map((sIdx, i) => {
                const done = i < pos - 1;
                const current = i === pos - 1;
                return (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span
                      className={
                        "grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold transition-colors " +
                        (done ? "bg-[#0057FF] text-white" : current ? "bg-[#0057FF]/[0.12] text-[#0057FF] ring-2 ring-[#0057FF]" : "bg-slate-100 text-slate-400")
                      }
                    >
                      {done ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className={"hidden text-[13px] font-semibold sm:inline " + (i <= pos - 1 ? "text-[#081A3A]" : "text-slate-400")}>{STEPS[sIdx]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-[#0057FF]"
                initial={false}
                animate={{ width: `${((pos - 1) / (total - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            </div>
          </div>
        )}

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {/* error */}
              {error && (
                <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700">
                  <span aria-hidden className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">!</span>
                  {error}
                </div>
              )}

              {/* ---------- STEP 1 — WELCOME ---------- */}
              {step === 0 && (
                <div>
                  <StepHeading
                    kicker={`Step ${pos} of ${total}`}
                    title="Let's build your hiring workflow"
                    sub="A few quick details and your talent-intelligence workspace is ready — assessments, recruiter pipelines and analytics in one place."
                  />
                  <div className="mt-7 space-y-4">
                    <EntField label="Full name" value={name} onChange={setName} placeholder="Priya Sharma" autoComplete="name" required />
                    <EntField label="Work email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" required icon={<MailIcon />} />
                    <EntField
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      required
                      icon={<LockIcon />}
                      trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
                    />
                  </div>
                </div>
              )}

              {/* ---------- ORGANIZATION ---------- */}
              {step === 2 && (
                <div>
                  <StepHeading kicker={`Step ${pos} of ${total}`} title="Tell us about your organization" sub="This tailors your workspace, benchmarks and pipelines." />
                  <div className="mt-7 space-y-6">
                    <EntField label="Organization name" value={orgName} onChange={setOrgName} placeholder="Acme Corporation" required />
                    <div>
                      <p className="mb-2.5 text-[13px] font-semibold text-[#081A3A]">Industry</p>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {INDUSTRIES.map((x) => (
                          <Pill key={x} selected={industry === x} onClick={() => setIndustry(x)}>{x}</Pill>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2.5 text-[13px] font-semibold text-[#081A3A]">Team size</p>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {TEAM_SIZES.map((x) => (
                          <Pill key={x} selected={teamSize === x} onClick={() => setTeamSize(x)}>{x}</Pill>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2.5 text-[13px] font-semibold text-[#081A3A]">Annual hiring volume</p>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {HIRING_VOLUMES.map((x) => (
                          <Pill key={x} selected={hiringVolume === x} onClick={() => setHiringVolume(x)}>{x}</Pill>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- PLATFORM SETUP ---------- */}
              {step === 1 && (
                <div>
                  <StepHeading kicker={`Step ${pos} of ${total}`} title="How will you use Taledge?" sub="Choose your primary role — you can invite the rest of your team later." />
                  <div className="mt-7 grid gap-3">
                    {PLATFORM_ROLES.map((r) => (
                      <OptionCard
                        key={r.key}
                        selected={platformRole === r.key}
                        onClick={() => setPlatformRole(r.key)}
                        title={r.label}
                        desc={r.desc}
                        path={r.path}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ---------- STEP 4 — ASSESSMENT PREFERENCES ---------- */}
              {step === 3 && (
                <div>
                  <StepHeading kicker={`Step ${pos} of ${total}`} title="Configure your assessments" sub="Select the modules to enable now. Everything stays adjustable from your workspace." />
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {ASSESSMENTS.map((a) => (
                      <OptionCard
                        key={a.key}
                        selected={prefs.includes(a.key)}
                        onClick={() => togglePref(a.key)}
                        title={a.label}
                        desc={a.desc}
                        path={a.path}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ---------- STEP 5 — SUCCESS ---------- */}
              {step === 4 && (
                <div className="py-6 text-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                    className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#0057FF] text-white shadow-[0_24px_60px_-24px_rgba(0,87,255,0.7)]"
                  >
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </motion.div>
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
                    className="mt-7 text-[2rem] font-extrabold tracking-[-0.02em] text-[#081A3A] sm:text-[2.4rem]"
                  >
                    Your workspace is ready
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.22 }}
                    className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-500"
                  >
                    {orgName ? `${orgName}'s` : "Your"} Taledge workspace is configured as{" "}
                    <span className="font-semibold text-[#081A3A]">{selectedRole?.label ?? "your team"}</span>. Launch in to start
                    turning candidate potential into proof.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
                    className="mt-9 flex flex-wrap items-center justify-center gap-3"
                  >
                    <button
                      type="button"
                      onClick={launchDashboard}
                      className="group inline-flex items-center gap-2 rounded-lg bg-[#0057FF] px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#0F4CFF] hover:shadow-md"
                    >
                      Launch dashboard
                      <Arrow className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-7 py-3.5 text-[15px] font-semibold text-[#081A3A] transition-all hover:border-[#0057FF]/40 hover:bg-slate-50"
                    >
                      Schedule a platform walkthrough
                    </Link>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* nav controls */}
        {!isSuccess && (
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => go(prevOf(step))}
              disabled={step === 0 || loading}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-3 text-[14px] font-semibold text-slate-500 transition-colors hover:text-[#081A3A] disabled:invisible"
            >
              <Arrow className="rotate-180" /> Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => (stepValid[step] ? go(nextOf(step)) : setError(stepErrors[step]))}
                className="group inline-flex items-center gap-2 rounded-lg bg-[#0057FF] px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#0F4CFF] hover:shadow-md"
              >
                Continue <Arrow className="transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (stepValid[3] ? createAccount() : setError(stepErrors[3]))}
                disabled={loading}
                aria-busy={loading}
                className="group inline-flex items-center gap-2 rounded-lg bg-[#0057FF] px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#0F4CFF] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Spinner /> : <>Create workspace <Arrow className="transition-transform group-hover:translate-x-0.5" /></>}
              </button>
            )}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
