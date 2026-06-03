"use client";

import { Section } from "@/components/glass";
import { Bar } from "@/components/score-ring";
import { recruiterPool } from "@/lib/data";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function Recruiter() {
  const [q, setQ] = useState("");
  const [minFit, setMinFit] = useState(60);
  const [filter, setFilter] = useState<"all" | "tech" | "behav" | "success">("all");

  const rows = useMemo(() => {
    return recruiterPool
      .filter((r) => r.fit >= minFit)
      .filter((r) => (q ? `${r.name} ${r.college} ${r.role}`.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => {
        if (filter === "tech") return b.tech - a.tech;
        if (filter === "behav") return b.behav - a.behav;
        if (filter === "success") return b.success - a.success;
        return b.fit - a.fit;
      });
  }, [q, minFit, filter]);

  return (
    <div className="relative overflow-hidden">
      {/* HERO STRIP */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 h-[280px] opacity-40" />
        <div className="mx-auto max-w-7xl px-5 pt-8 pb-8 sm:px-8 sm:pt-12 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="pill">
                <IconBriefcase /> Recruiter Console
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight leading-[1.05] text-ink-900 sm:text-3xl md:text-4xl">
                Northbridge Capital
                <br />
                Talent Pipeline
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-ink-500 sm:text-base">
                12 active reqs · Off-campus + campus pipeline. Every candidate is scored
                across <span className="font-semibold text-ink-900">16 dimensions</span>,
                published as a defensible Fit Score.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost">
                <IconUpload /> Upload list
              </button>
              <button className="btn-primary">
                Post new job
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {/* FILTERS */}
        <div className="card p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, college, role…"
                className="input mt-2"
              />
            </div>
            <div>
              <label className="label">Min Fit Score</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={40}
                  max={95}
                  value={minFit}
                  onChange={(e) => setMinFit(Number(e.target.value))}
                  className="flex-1 accent-ink-900"
                />
                <span className="w-10 text-right text-xl font-bold tracking-tight text-ink-900">{minFit}</span>
              </div>
            </div>
            <div>
              <label className="label">Sort by</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {([["all", "Fit"], ["tech", "Technical"], ["behav", "Behavioural"], ["success", "Success"]] as const).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      filter === k
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Quick filters</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">High resilience + initiative</span>
                <span className="chip">Strong comm + moderate tech</span>
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATES */}
        <Section className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="pill"><IconTarget /> Pipeline</div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
                Candidates · {rows.length} matching
              </h2>
            </div>
            <span className="chip-soft">Sorted by {filter === "all" ? "Fit" : filter === "tech" ? "Technical" : filter === "behav" ? "Behavioural" : "Success"}</span>
          </div>
          <div className="card overflow-x-auto p-0">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-12 border-b border-ink-200 bg-ink-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                <div className="col-span-4">Candidate</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-1">Fit</div>
                <div className="col-span-2">Tech / Behav</div>
                <div className="col-span-1">Success</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              {rows.map((r) => (
                <div
                  key={r.studentId + r.name}
                  className="grid grid-cols-12 items-center border-b border-ink-100 px-5 py-4 text-sm last:border-0 hover:bg-ink-50"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink-900 text-xs font-semibold text-white">
                      {r.name.split(" ").map((p) => p[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink-900">{r.name}</div>
                      <div className="truncate text-[11px] text-ink-500">{r.college}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-ink-700">{r.role}</div>
                  <div className="col-span-1">
                    <span className="text-2xl font-bold tracking-tight text-ink-900">{r.fit}</span>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Bar value={r.tech} tone="dark" />
                    <Bar value={r.behav} tone="dark" />
                  </div>
                  <div className="col-span-1">
                    <span className={r.success > 75 ? "chip-success" : r.success > 65 ? "chip-warn" : "chip-danger"}>
                      {r.success}%
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {r.flags[0] && (
                      <span className={r.flags[0].toLowerCase().includes("flag") || r.flags[0].toLowerCase().includes("defensive") ? "chip-warn !text-[10px]" : "chip-success !text-[10px]"}>
                        {r.flags[0]}
                      </span>
                    )}
                    <Link
                      href={["priya", "rohan", "kabir"].includes(r.studentId) ? `/student/${r.studentId}` : "/student/rohan"}
                      className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-ink-500">
                  No candidates match the current filters. Lower the minimum fit or clear search.
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* SHORTLIST & SHARED */}
        <Section className="mt-12">
          <div className="mb-5">
            <div className="pill"><IconLink /> Shortlist</div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-ink-900 sm:text-xl md:text-2xl">
              Shortlist &amp; Shared Links
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="label">Active shortlist</div>
                <span className="chip-dark">Live</span>
              </div>
              <div className="mt-3 text-5xl font-bold tracking-tight text-ink-900">7</div>
              <div className="text-xs text-ink-500">Across 12 active reqs</div>
              <button className="btn-primary mt-5 w-full">Send group invite</button>
            </div>
            <div className="card p-5 sm:p-6">
              <div className="label">Top colleges</div>
              <ul className="mt-3 space-y-2.5 text-sm">
                {[
                  ["IIT Indore", "84"],
                  ["BITS Pilani", "79"],
                  ["NIT Trichy", "81"],
                  ["Atherix IoT", "72"],
                ].map(([name, score], i) => (
                  <li key={name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink-700">
                      <span className="text-[11px] font-bold tracking-tight text-ink-400">0{i + 1}</span>
                      <span className="font-medium text-ink-900">{name}</span>
                    </span>
                    <span className="text-base font-bold tracking-tight tabular-nums text-ink-900">{score}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5 sm:p-6">
              <div className="label">Shared link to institute</div>
              <p className="mt-3 text-sm text-ink-700">
                Generate scoped recruiter link with batch view + interview score visibility.
              </p>
              <button className="btn-ghost mt-5 w-full">Generate link</button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

/* Inline icons */
function IconBriefcase() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
