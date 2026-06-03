"use client";

import { Section } from "@/components/glass";
import { Bar, Sparkline } from "@/components/score-ring";
import { useEffect, useState } from "react";

type Turn = { who: "ai" | "you"; text: string };

const scripted: Turn[] = [
  { who: "ai", text: "Hi Rohan · welcome back. Last week you flagged the stakeholder review on Tuesday went sideways. Want to debrief on that?" },
  { who: "you", text: "Yeah. I think I got defensive when product pushed back on the rollout timeline." },
  { who: "ai", text: "Got it. Let's separate what they said from what you heard. In one sentence · what did Priya actually say?" },
  { who: "you", text: "She said the rollout was too aggressive for the support team's current capacity." },
  { who: "ai", text: "Right. That's a capacity claim, not a critique of your plan. Notice the difference? Next time, pause two seconds and restate before responding." },
];

export default function CoachAI() {
  const [vol, setVol] = useState(0);
  const [conn, setConn] = useState(false);
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setVol(Math.random() * 100), 200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* HERO STRIP */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 h-[280px] opacity-40" />
        <div className="mx-auto max-w-7xl px-5 pt-8 pb-8 sm:px-8 sm:pt-12 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill">
                  <IconSpark /> Phase 2 · Preview
                </span>
                <span className="chip-soft">Lifelong Success Intelligence</span>
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight leading-[1.05] text-ink-900 sm:text-3xl md:text-4xl">
                Real-time Voice
                <br />
                Coaching · Built for Roles
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-ink-500 sm:text-base">
                Powered by <span className="font-semibold text-ink-900">Claude Opus 4.6</span> +
                <span className="font-semibold text-ink-900"> ElevenLabs Flash v2.5</span> (75ms latency) ·
                32 languages including Hindi &amp; regional.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">75ms latency</span>
              <span className="chip">32 languages</span>
              <span className="chip-dark">In development</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* LEFT · VOICE ORB + TRANSCRIPT */}
          <div className="lg:col-span-2">
            <div className="card relative overflow-hidden p-6 sm:p-10">
              <div className="bg-grid-soft pointer-events-none absolute inset-0 opacity-50" />
              <div className="relative flex flex-col items-center">
                {/* Orb */}
                <div className="relative grid place-items-center">
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-full bg-ink-900/5 blur-2xl transition-all duration-300 ${conn ? "opacity-100" : "opacity-0"}`}
                    style={{ width: 260, height: 260, transform: "translate(-50%, -50%)", top: "50%", left: "50%" }}
                  />
                  <div className="grid h-44 w-44 place-items-center rounded-full border border-ink-200 bg-white sm:h-56 sm:w-56">
                    <div className="grid h-32 w-32 place-items-center rounded-full border border-ink-200 bg-ink-50 sm:h-40 sm:w-40">
                      <div
                        className="grid place-items-center rounded-full bg-ink-900 transition-all duration-150"
                        style={{
                          width: 70 + (conn ? vol * 0.5 : 0),
                          height: 70 + (conn ? vol * 0.5 : 0),
                        }}
                      >
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-7 text-center">
                  <div className="text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                    AI Coach · Sales
                  </div>
                  <div className="mt-1 text-sm text-ink-500">
                    {conn ? "Listening…" : "Tap to begin a coaching session"}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button onClick={() => setConn((v) => !v)} className={conn ? "btn-ghost" : "btn-primary"}>
                    {conn ? "End session" : "Start voice session"}
                    {!conn && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => setTurn((t) => Math.min(t + 1, scripted.length))}
                    className="btn-ghost"
                    disabled={!conn}
                  >
                    Advance demo ({turn}/{scripted.length})
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-500">
                  <span className="chip">Latency: 75ms</span>
                  <span className="chip">Lang: English (en-IN)</span>
                  <span className="chip">Voice: Sonia</span>
                </div>
              </div>
            </div>

            <div className="card mt-5 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="label">Live transcript</div>
                {conn && <span className="chip-dark">Recording</span>}
              </div>
              <div className="mt-4 space-y-3">
                {scripted.slice(0, turn).map((t, i) => (
                  <div key={i} className={`flex ${t.who === "ai" ? "justify-start" : "justify-end"} gap-2`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        t.who === "ai"
                          ? "rounded-tl-sm border border-ink-200 bg-white text-ink-800"
                          : "rounded-tr-sm bg-ink-900 text-white"
                      }`}
                    >
                      {t.text}
                    </div>
                  </div>
                ))}
                {turn === 0 && (
                  <div className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400">
                    Start the session and advance turns to play the scripted demo.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT · SIGNALS */}
          <div className="space-y-4">
            <div className="card p-5 sm:p-6">
              <div className="label">Verticals available</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  { e: "Sales", icon: <IconBriefcase /> },
                  { e: "Leadership", icon: <IconCrown /> },
                  { e: "Sports", icon: <IconActivity /> },
                  { e: "Blue-collar", icon: <IconTool /> },
                ].map((v) => (
                  <button key={v.e} className="rounded-xl border border-ink-200 bg-white px-3 py-3 text-left text-ink-700 transition hover:border-ink-900 hover:bg-ink-50">
                    <div className="text-ink-900">{v.icon}</div>
                    <div className="mt-2 text-sm font-semibold text-ink-900">{v.e}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="label">Role transition gap</div>
                <span className="chip-soft">Sales</span>
              </div>
              <div className="mt-3 text-base font-semibold tracking-tight text-ink-900">SDR → AE Promotion</div>
              <div className="mt-4 space-y-3 text-xs">
                <SignalRow label="Discovery framing" v={62} tone="warn" />
                <SignalRow label="Objection handling" v={71} tone="dark" />
                <SignalRow label="Multi-threading" v={48} tone="danger" />
                <SignalRow label="Forecast accuracy" v={66} tone="dark" />
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <div className="label">Longitudinal growth</div>
              <div className="mt-2 font-semibold text-ink-900">Confidence index</div>
              <div className="mt-3">
                <Sparkline data={[55, 58, 60, 64, 68, 72, 75, 78, 81]} tone="success" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Stat label="6-mo lift" value="+26" />
                <Stat label="Sessions" value="34" />
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <div className="label">Behavioural nudge</div>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                "On your next stakeholder call, restate concerns in one sentence <em>before</em> responding. You've practiced this 3×."
              </p>
              <button className="btn-ghost mt-4 w-full">Send to phone</button>
            </div>
          </div>
        </div>

        {/* PHASE 2 GRID */}
        <Section className="mt-12">
          <div className="mb-6">
            <div className="pill"><IconSpark /> Phase 2 Roadmap</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              What Phase 2 Unlocks
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-ink-500">
              Six new verticals and longitudinal growth tracking. Built on the same closed-loop architecture.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Sales Vertical", d: "AE/SDR coaching, discovery + objection drills, forecasting reflection." },
              { t: "Leadership Vertical", d: "First-time manager onboarding, conflict resolution, feedback loops." },
              { t: "Sports Vertical", d: "Pre-game mental routines, recovery, focus drills · multilingual." },
              { t: "Blue-collar coaching", d: "Hindi + regional language voice coaching for shop-floor & service workers." },
              { t: "Role Gap Analyzer", d: "Compare current role profile vs target role · generates skill + behaviour pathway." },
              { t: "Longitudinal Tracker", d: "12-week + 12-month trajectories. Team dynamics dashboard for org buyers." },
            ].map((c, i) => (
              <div key={c.t} className="card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="label">Vertical {String(i + 1).padStart(2, "0")}</span>
                  <span className="chip-soft">Phase 2</span>
                </div>
                <div className="mt-4 text-base font-semibold tracking-tight text-ink-900">{c.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{c.d}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function SignalRow({ label, v, tone }: { label: string; v: number; tone: "dark" | "success" | "warn" | "danger" }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-ink-700">{label}</span>
        <span className="text-sm font-bold tracking-tight tabular-nums text-ink-900">{v}</span>
      </div>
      <Bar value={v} tone={tone} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft p-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-lg font-bold tracking-tight text-ink-900">{value}</div>
    </div>
  );
}

/* Inline icons */
function IconSpark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.7L20 10l-5 4 1.5 6L12 17l-4.5 3L9 14l-5-4 6.1-1.3z" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function IconCrown() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18h20" />
      <path d="M5 18 3 7l5 5 4-8 4 8 5-5-2 11" />
    </svg>
  );
}
function IconActivity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconTool() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
