"use client";

import React, { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Sparkles,
  Gauge,
  AlertTriangle,
  Upload,
  Search,
  Share2,
  X,
  Building2,
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  BarChart3,
  CalendarDays,
  Menu,
  LifeBuoy,
} from "lucide-react";
import { Button, ButtonLink, Badge, Drawer } from "@/components/ui";
import { Bar } from "@/components/score-ring";
import { BellCurve } from "@/components/institute/bell-curve";
import {
  students as seedStudents,
  organisations,
  studentBranches,
  studentSemesters,
  type Student,
} from "@/lib/data";
import { cn } from "@/lib/utils";

type Tier = "best" | "average" | "below";
type Row = Student & { tier: Tier };

const TIER_META: Record<Tier, { label: string; tone: "brand" | "warn" | "danger"; badge: "brand" | "warn" | "danger"; dot: string; rank: number }> = {
  best: { label: "Best", tone: "brand", badge: "brand", dot: "bg-brand-500", rank: 0 },
  average: { label: "Average", tone: "warn", badge: "warn", dot: "bg-amber-500", rank: 1 },
  below: { label: "Below par", tone: "danger", badge: "danger", dot: "bg-rose-500", rank: 2 },
};

const STATUS_TONE: Record<Student["status"], "neutral" | "brand" | "success" | "warn"> = {
  "Not started": "neutral",
  "In progress": "warn",
  "Interview-ready": "success",
  Published: "brand",
};

const ORG_TONE: Record<string, "brand" | "warn" | "success"> = {
  Planning: "brand",
  Scheduled: "warn",
  Visited: "success",
};

const sideNav: { id: string; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "distribution", label: "Distribution", icon: BarChart3 },
  { id: "students", label: "Students", icon: Users },
  { id: "drives", label: "Campus drives", icon: Building2 },
  { id: "upload", label: "Upload", icon: Upload },
];

type SortKey = "name" | "tech" | "behav" | "fit" | "tier" | "status";

/**
 * Split a list of students into 20/60/20 tiers by fit.fit (descending).
 * Returns each student annotated with a tier and the band aggregates.
 */
function computeSplit(list: Student[]) {
  const safe = Array.isArray(list) ? list.filter(Boolean) : [];
  const n = safe.length;
  const sorted = [...safe].sort((a, b) => (b.fit?.fit ?? 0) - (a.fit?.fit ?? 0));
  const bestCount = Math.round(n * 0.2);
  const belowCount = Math.round(n * 0.2);
  const tierOf = new Map<string, Tier>();
  sorted.forEach((s, i) => {
    let tier: Tier = "average";
    if (i < bestCount) tier = "best";
    else if (i >= n - belowCount) tier = "below";
    tierOf.set(s.id, tier);
  });
  const rows: Row[] = safe.map((s) => ({ ...s, tier: tierOf.get(s.id) ?? "average" }));
  const counts = { best: 0, average: 0, below: 0 };
  rows.forEach((r) => (counts[r.tier] += 1));
  const pct = (c: number) => (n === 0 ? 0 : Math.round((c / n) * 100));
  return {
    rows,
    bands: {
      best: { key: "best" as const, label: "Best 20%", count: counts.best, pct: pct(counts.best) },
      average: { key: "average" as const, label: "Average 60%", count: counts.average, pct: pct(counts.average) },
      below: { key: "below" as const, label: "Below 20%", count: counts.below, pct: pct(counts.below) },
    },
    total: n,
  };
}

let uploadSeq = 0;

/** Parse pasted CSV / file text into student-like rows: "Name, Branch, Semester". */
function parseUpload(text: string): Student[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Student[] = [];
  for (const line of lines) {
    const cells = line.split(",").map((c) => c.trim());
    const name = cells[0];
    if (!name) continue;
    if (/^name$/i.test(name)) continue;
    const branch = cells[1] || studentBranches[0] || "Computer Science";
    const semRaw = parseInt(cells[2] ?? "", 10);
    const semester = Number.isFinite(semRaw) ? semRaw : studentSemesters[0] ?? 6;
    const fit = Number.isFinite(parseInt(cells[3] ?? "", 10)) ? parseInt(cells[3], 10) : 68;
    const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    uploadSeq += 1;
    out.push({
      id: `upload-${Date.now()}-${uploadSeq}`,
      name,
      avatar: initials || "NA",
      branch,
      dept: branch,
      semester,
      year: "Final Year",
      college: "TalEdge School of Engineering",
      cgpa: 7.5,
      targetRole: "Software Engineer",
      resumeSummary: "",
      projects: [],
      skills: [],
      fit: { technical: fit, behavioural: fit, fit, successProbability: fit },
      dnla: [],
      strengths: [],
      developmentAreas: [],
      risks: [],
      status: "Not started",
    });
  }
  return out;
}

export default function InstitutePlacementDashboard() {
  // Added (uploaded) students merged on top of the seed list.
  const [added, setAdded] = useState<Student[]>([]);
  const allStudents = useMemo(() => [...seedStudents, ...added], [added]);

  // Split + tiers recompute whenever the population changes.
  const { rows, bands, total } = useMemo(() => computeSplit(allStudents), [allStudents]);

  // KPI roll-ups from the existing cohort data (no new data sources).
  const kpis = useMemo(() => {
    const fits = allStudents.map((s) => s.fit?.fit ?? 0);
    const readyCount = fits.filter((f) => f >= 70).length;
    const avgFit = total === 0 ? 0 : Math.round(fits.reduce((sum, f) => sum + f, 0) / total);
    const readyPct = total === 0 ? 0 : Math.round((readyCount / total) * 100);
    return { readyCount, readyPct, avgFit };
  }, [allStudents, total]);

  // ── Filters ──
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [tier, setTier] = useState<"" | Tier>("");
  const [query, setQuery] = useState("");

  // ── Presentation-only console state (mirrors the recruiter console) ──
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickView, setQuickView] = useState<Row | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "fit", dir: "desc" });
  const [visible, setVisible] = useState(8);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 480);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileNav(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = rows.filter((r) => {
      if (branch && r.branch !== branch) return false;
      if (semester && String(r.semester ?? "") !== semester) return false;
      if (tier && r.tier !== tier) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (sort.key) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "tech": return (a.fit.technical - b.fit.technical) * dir;
        case "behav": return (a.fit.behavioural - b.fit.behavioural) * dir;
        case "tier": return (TIER_META[a.tier].rank - TIER_META[b.tier].rank) * dir;
        case "status": return a.status.localeCompare(b.status) * dir;
        default: return (a.fit.fit - b.fit.fit) * dir;
      }
    });
  }, [rows, branch, semester, tier, query, sort]);

  // Reset pagination when the filter/sort surface changes.
  useEffect(() => { setVisible(8); }, [branch, semester, tier, query, sort]);

  const visibleRows = filtered.slice(0, visible);

  const clearFilters = () => { setBranch(""); setSemester(""); setTier(""); setQuery(""); };
  const hasFilters = Boolean(branch || semester || tier || query);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "status" ? "asc" : "desc" }));

  // Active-filter chip summary (each chip clears just that filter).
  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (query) activeFilters.push({ key: "q", label: `Search: "${query}"`, clear: () => setQuery("") });
  if (branch) activeFilters.push({ key: "b", label: branch, clear: () => setBranch("") });
  if (semester) activeFilters.push({ key: "s", label: `Sem ${semester}`, clear: () => setSemester("") });
  if (tier) activeFilters.push({ key: "t", label: TIER_META[tier].label, clear: () => setTier("") });

  // ── Selection / share ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someFilteredSelected = filteredIds.some((id) => selected.has(id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });

  const selectedCount = selected.size;
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // ── Upload ──
  const [pasteText, setPasteText] = useState("");
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const commitUpload = (text: string) => {
    const parsed = parseUpload(text);
    if (parsed.length === 0) {
      setUploadMsg("No valid rows found. Use: Name, Branch, Semester per line.");
      return;
    }
    setAdded((prev) => [...prev, ...parsed]);
    setUploadMsg(`${parsed.length} student${parsed.length === 1 ? "" : "s"} added.`);
    setPasteText("");
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => commitUpload(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Confirmation toast */}
      {confirmation && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2" role="status" aria-live="polite">
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-ink-800 shadow-lg backdrop-blur-xl">
            <CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" /> {confirmation}
            <button type="button" aria-label="Dismiss" onClick={() => setConfirmation(null)} className="ml-1 text-ink-400 hover:text-ink-700">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile nav drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-ink-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Placement cell</p>
              <button type="button" aria-label="Close" onClick={() => setMobileNav(false)} className="grid h-8 w-8 place-items-center rounded-md text-ink-500 hover:bg-ink-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav activeSection={activeSection} onSelect={(id) => { scrollTo(id); setMobileNav(false); }} />
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[88rem] gap-8 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        {/* ───────────── Desktop left rail ───────────── */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Placement cell</p>
            <div className="mt-3">
              <SidebarNav activeSection={activeSection} onSelect={scrollTo} />
            </div>
            <div className="mt-6 rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex items-center gap-2 text-ink-700">
                <LifeBuoy className="h-4 w-4" aria-hidden />
                <span className="text-sm font-bold">Need a hand?</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">Our team can help you import cohorts and run placement drives.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setConfirmation("Support chat is coming soon.")}>Contact support</Button>
            </div>
          </div>
        </aside>

        {/* ───────────── Main column ───────────── */}
        <main className="min-w-0 flex-1">
          {/* Breadcrumb row + mobile menu button */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
              <span>Institute</span>
              <span aria-hidden>/</span>
              <span className="text-ink-700">Placement Command Center</span>
            </nav>
            <button type="button" aria-label="Open menu" onClick={() => setMobileNav(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-white text-ink-700 lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 pb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Placement Command Center</h1>
              <p className="mt-1.5 max-w-xl text-sm text-ink-500">Cohort distribution, candidate readiness, campus drives and profile sharing — everything you need to run a placement season.</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live · {total} students
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => scrollTo("upload")}>
                <Upload size={16} aria-hidden="true" /> Upload students
              </Button>
              <Button type="button" variant="primary" size="sm" disabled={selectedCount === 0} onClick={() => { setConfirmation(null); setShareOpen(true); }}>
                <Share2 size={16} aria-hidden="true" /> Share selected
              </Button>
            </div>
          </header>

          {/* ── Overview / KPIs ── */}
          <section id="overview" className="scroll-mt-24 pt-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)
              ) : (
                <>
                  <KpiTile label="Cohort size" value={`${total}`} hint="Students in the placement pool" icon={<Users size={16} />} />
                  <KpiTile label="Placement-ready" value={`${kpis.readyPct}%`} hint={`${kpis.readyCount} of ${total} at fit 70+`} icon={<Sparkles size={16} />} bar={{ pct: kpis.readyPct, tone: "bg-emerald-500" }} />
                  <KpiTile label="Average fit" value={`${kpis.avgFit}`} hint="Overall fit across cohort" icon={<Gauge size={16} />} bar={{ pct: kpis.avgFit, tone: "bg-brand-600" }} />
                  <KpiTile label="At-risk" value={`${bands.below.count}`} hint={`Bottom ${bands.below.pct}% — needs intervention`} icon={<AlertTriangle size={16} />} bar={{ pct: bands.below.pct, tone: "bg-rose-500" }} valueTone="text-rose-600" />
                </>
              )}
            </div>
          </section>

          {/* ── Cohort fit distribution ── */}
          <section id="distribution" className="scroll-mt-24 pt-12">
            <div className="flex items-center justify-between">
              <SectionTitle icon={<BarChart3 className="h-4 w-4" />}>Cohort fit distribution</SectionTitle>
              <Badge tone="neutral" className="text-[10px] uppercase tracking-widest">20 / 60 / 20</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-500">{total} candidates split into a 20 / 60 / 20 readiness curve by overall fit.</p>

            <div className="mt-5 rounded-xl border border-ink-200 bg-white p-6">
              {loading ? (
                <SkeletonBlock className="h-56 w-full" />
              ) : (
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.6fr_1fr]">
                  <div className="rounded-xl border border-ink-200 bg-ink-50/40 p-4">
                    <BellCurve best={bands.best} average={bands.average} below={bands.below} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <BandTile tier="best" label="Best profiles · top 20%" count={bands.best.count} sub={`${bands.best.pct}% of cohort · interview-ready edge`} icon={<Sparkles size={16} />} />
                    <BandTile tier="average" label="Average · middle 60%" count={bands.average.count} sub={`${bands.average.pct}% of cohort · polish to convert`} icon={<Users size={16} />} />
                    <BandTile tier="below" label="Below par · bottom 20%" count={bands.below.count} sub={`${bands.below.pct}% of cohort · needs intervention`} icon={<AlertTriangle size={16} />} />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Students ── */}
          <section id="students" className="scroll-mt-24 pt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <SectionTitle icon={<Users className="h-4 w-4" />}>All students</SectionTitle>
                <p className="mt-1 text-sm text-ink-500" aria-live="polite">
                  {filtered.length} of {total} shown{selectedCount > 0 ? ` · ${selectedCount} selected` : ""}. Click a row for details.
                </p>
              </div>
            </div>

            {/* Filters toolbar */}
            <div className="mt-5 rounded-xl border border-ink-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FilterField label="Search name" htmlFor="f-search">
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                    <input id="f-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search candidates…" className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  </div>
                </FilterField>
                <FilterField label="Branch" htmlFor="f-branch">
                  <select id="f-branch" value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                    <option value="">All branches</option>
                    {studentBranches.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </FilterField>
                <FilterField label="Semester" htmlFor="f-sem">
                  <select id="f-sem" value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                    <option value="">All semesters</option>
                    {studentSemesters.map((s) => <option key={s} value={String(s)}>Sem {s}</option>)}
                  </select>
                </FilterField>
                <FilterField label="Tier">
                  <SegmentedControl
                    ariaLabel="Tier"
                    options={[["", "All"], ["best", "Best"], ["average", "Avg"], ["below", "Below"]]}
                    value={tier}
                    onChange={(v) => setTier(v as "" | Tier)}
                  />
                </FilterField>
              </div>
              {activeFilters.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Active</span>
                  {activeFilters.map((f) => (
                    <button key={f.key} type="button" onClick={f.clear} className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900">
                      {f.label}
                      <X size={12} aria-hidden />
                    </button>
                  ))}
                  <button type="button" onClick={clearFilters} className="text-xs font-semibold text-ink-500 hover:text-ink-900">Clear all</button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="mt-5 overflow-hidden rounded-xl border border-ink-200 bg-white">
              {loading ? (
                <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-10 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-ink-50 text-ink-400"><Search size={22} /></div>
                  <p className="text-sm font-bold text-ink-900">No students match these filters.</p>
                  <p className="mt-1 text-sm text-ink-500">Try widening the branch, semester or tier.</p>
                  {hasFilters && <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 bg-ink-50 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                        <th scope="col" className="w-10 px-4 py-3">
                          <input type="checkbox" aria-label="Select all visible students" checked={allFilteredSelected} ref={(el) => { if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected; }} onChange={toggleAll} className="h-4 w-4 rounded border-ink-300 accent-brand-600" />
                        </th>
                        <Th label="Candidate" sortKey="name" sort={sort} onSort={toggleSort} />
                        <th scope="col" className="px-4 py-3 font-bold">Branch / Sem</th>
                        <Th label="Tech" sortKey="tech" sort={sort} onSort={toggleSort} />
                        <Th label="Behav" sortKey="behav" sort={sort} onSort={toggleSort} />
                        <Th label="Fit" sortKey="fit" sort={sort} onSort={toggleSort} className="w-44" />
                        <Th label="Tier" sortKey="tier" sort={sort} onSort={toggleSort} />
                        <Th label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                        <th scope="col" className="px-4 py-3 text-right font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {visibleRows.map((r) => {
                        const meta = TIER_META[r.tier];
                        const isSel = selected.has(r.id);
                        return (
                          <tr key={r.id} onClick={() => setQuickView(r)} className={cn("group cursor-pointer transition-colors hover:bg-ink-50", isSel && "bg-brand-50/60")}>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" aria-label={`Select ${r.name}`} checked={isSel} onChange={() => toggleOne(r.id)} className="h-4 w-4 rounded border-ink-300 accent-brand-600" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">{r.avatar}</div>
                                  <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white", meta.dot)} />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-ink-900">{r.name}</div>
                                  <div className="truncate text-xs text-ink-500">{r.targetRole}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-ink-800">{r.branch}</div>
                              <div className="text-xs text-ink-500">{r.semester ? `Sem ${r.semester}` : r.year}</div>
                            </td>
                            <td className="px-4 py-3 tabular-nums text-ink-700">{r.fit.technical}</td>
                            <td className="px-4 py-3 tabular-nums text-ink-700">{r.fit.behavioural}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-8 text-xs font-bold tabular-nums text-ink-900">{r.fit.fit}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                                  <div className={cn("h-full rounded-full", meta.dot)} style={{ width: `${r.fit.fit}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3"><Badge tone={meta.badge}>{meta.label}</Badge></td>
                            <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <ButtonLink href={`/student/${r.id}`} variant="ghost" size="sm">View <ChevronRight size={13} aria-hidden="true" /></ButtonLink>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && filtered.length > 0 && (
                <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3">
                  <span className="text-xs text-ink-500">Showing {visibleRows.length} of {filtered.length}</span>
                  {visible < filtered.length ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setVisible((v) => Math.min(v + 8, filtered.length))}>Load more</Button>
                  ) : (
                    <span className="text-xs font-medium text-ink-400">All students shown</span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Campus drives ── */}
          <section id="drives" className="scroll-mt-24 pt-12">
            <SectionTitle icon={<Building2 className="h-4 w-4" />}>Campus drives</SectionTitle>
            <p className="mt-1 text-sm text-ink-500">{organisations.length} organisations planning visits this season.</p>

            {organisations.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-ink-300 bg-white p-10 text-center">
                <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-ink-50 text-ink-400"><Building2 size={20} /></div>
                <p className="text-sm font-bold text-ink-900">No campus drives scheduled yet.</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">Organisations planning visits this season will appear here.</p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {organisations.map((o) => (
                  <div key={o.id} className="rounded-xl border border-ink-200 bg-white p-5 transition-colors hover:border-ink-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-ink-900">{o.name}</div>
                        <div className="mt-0.5 text-xs text-ink-500">{o.sector}</div>
                      </div>
                      <Badge tone={ORG_TONE[o.status] ?? "neutral"}>{o.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(o.roles ?? []).map((role) => (
                        <span key={role} className="rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{role}</span>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-4 text-center">
                      <div>
                        <div className="text-base font-bold tabular-nums text-ink-900">{o.openings}</div>
                        <div className="text-[10px] uppercase tracking-wide text-ink-500">Openings</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-ink-900">{o.ctc}</div>
                        <div className="text-[10px] uppercase tracking-wide text-ink-500">CTC</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-ink-900">{o.date.split(",")[0]}</div>
                        <div className="text-[10px] uppercase tracking-wide text-ink-500">Drive</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Upload students ── */}
          <section id="upload" className="scroll-mt-24 pt-12">
            <SectionTitle icon={<Upload className="h-4 w-4" />}>Upload students</SectionTitle>
            <p className="mt-1 text-sm text-ink-500">
              Paste CSV rows or upload a .csv file — one student per line: <span className="font-mono text-ink-700">Name, Branch, Semester</span>.
            </p>

            <div className="mt-5 rounded-xl border border-ink-200 bg-white p-5">
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <label htmlFor="paste-csv" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-500">Paste CSV rows</label>
                  <textarea id="paste-csv" value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4} placeholder={"Riya Kapoor, Computer Science, 7\nKabir Anand, Mechanical, 6"} className="w-full rounded-lg border border-dashed border-ink-300 bg-ink-50/40 px-3.5 py-2.5 font-mono text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
                <div className="flex flex-col gap-2 md:pt-7">
                  <Button type="button" onClick={() => commitUpload(pasteText)} disabled={!pasteText.trim()}>Add pasted rows</Button>
                  <label htmlFor="file-csv" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:border-ink-300 hover:bg-ink-50">
                    <Upload size={15} aria-hidden="true" /> Upload .csv
                  </label>
                  <input id="file-csv" type="file" accept=".csv,text/csv" onChange={onFile} className="sr-only" />
                </div>
              </div>
              {uploadMsg && (
                <p role="status" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={13} aria-hidden="true" /> {uploadMsg}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Sticky bulk-action bar */}
      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-2 shadow-[0_16px_44px_-18px_rgba(16,24,40,0.35)]">
            <span className="px-2 text-sm font-bold text-ink-900">{selectedCount} selected</span>
            <span className="h-5 w-px bg-ink-200" />
            <Button type="button" variant="primary" size="sm" onClick={() => { setConfirmation(null); setShareOpen(true); }}>
              <Share2 className="h-4 w-4" /> Share selected
            </Button>
            <button type="button" onClick={() => setSelected(new Set())} className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">Clear</button>
          </div>
        </div>
      )}

      {/* Student quick-view drawer */}
      <Drawer
        open={!!quickView}
        onClose={() => setQuickView(null)}
        title={quickView?.name ?? "Student"}
        width="md"
        footer={
          quickView && (
            <ButtonLink href={`/student/${quickView.id}`} className="w-full justify-center">
              View full profile <ChevronRight className="h-4 w-4" />
            </ButtonLink>
          )
        }
      >
        {quickView && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-700">{quickView.avatar}</div>
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white", TIER_META[quickView.tier].dot)} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-ink-900">{quickView.name}</p>
                <p className="truncate text-sm text-ink-500">{quickView.targetRole} · {quickView.branch}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone={TIER_META[quickView.tier].badge}>{TIER_META[quickView.tier].label}</Badge>
              <Badge tone={STATUS_TONE[quickView.status]}>{quickView.status}</Badge>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[["Fit", `${quickView.fit.fit}`], ["Success", `${quickView.fit.successProbability}%`], ["CGPA", `${quickView.cgpa}`], ["Sem", `${quickView.semester ?? "—"}`]].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-ink-200 bg-white p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{l}</p>
                  <p className="mt-1 text-base font-extrabold text-ink-900">{v}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Interview scores</p>
              <ScoreBar label="Technical" value={quickView.fit.technical} />
              <ScoreBar label="Behavioural" value={quickView.fit.behavioural} />
            </div>

            {(quickView.strengths ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Strengths</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickView.strengths.map((s) => (
                    <span key={s} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {(quickView.developmentAreas ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Development areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickView.developmentAreas.map((s) => (
                    <span key={s} className="rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs font-semibold text-ink-700">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {(quickView.risks ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">Risks</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickView.risks.map((s) => (
                    <span key={s} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ShareDialog
        open={shareOpen}
        count={selectedCount}
        onClose={() => setShareOpen(false)}
        onConfirm={(orgName) => {
          setShareOpen(false);
          setConfirmation(`Shared ${selectedCount} profile${selectedCount === 1 ? "" : "s"} with ${orgName}`);
          setSelected(new Set());
        }}
      />
    </div>
  );
}

/* --------------------------- components --------------------------- */

function SidebarNav({ activeSection, onSelect }: { activeSection: string; onSelect: (id: string) => void }) {
  return (
    <nav className="space-y-0.5" aria-label="Institute sections">
      {sideNav.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => { e.preventDefault(); onSelect(item.id); }}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-semibold transition-colors ${active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-transparent text-ink-600 hover:bg-ink-100/70 hover:text-ink-900"}`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function KpiTile({ label, value, hint, icon, bar, valueTone }: { label: string; value: string; hint: string; icon: ReactNode; bar?: { pct: number; tone: string }; valueTone?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200">{icon}</span>
      </div>
      <div className={cn("mt-3 text-3xl font-extrabold tabular-nums tracking-tight", valueTone ?? "text-ink-900")}>{value}</div>
      {bar && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div className={cn("h-full rounded-full", bar.tone)} style={{ width: `${Math.max(0, Math.min(100, bar.pct))}%` }} />
        </div>
      )}
      <div className="mt-2 text-xs text-ink-500">{hint}</div>
    </div>
  );
}

function BandTile({ tier, label, count, sub, icon }: { tier: Tier; label: string; count: number; sub: string; icon: ReactNode }) {
  const meta = TIER_META[tier];
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-2xl font-extrabold tabular-nums text-ink-900">{count}</span>
        <span className="text-ink-400">{icon}</span>
      </div>
      <p className="mt-1 text-xs text-ink-500">{sub}</p>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-bold text-ink-900">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200">{icon}</span>
      {children}
    </h2>
  );
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</label>
      {children}
    </div>
  );
}

function SegmentedControl({ options, value, onChange, ariaLabel }: { options: [string, string][]; value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex rounded-lg border border-ink-200 bg-white p-0.5">
      {options.map(([id, label]) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${value === id ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:text-ink-900"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Th({ label, sortKey, sort, onSort, className }: { label: string; sortKey: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" className={cn("px-4 py-3", className)}>
      <button type="button" onClick={() => onSort(sortKey)} className={cn("inline-flex items-center gap-1 font-bold uppercase tracking-wider transition-colors", active ? "text-brand-700" : "text-ink-500 hover:text-ink-700")}>
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden className={cn(active ? "opacity-100" : "opacity-40", active && sort.dir === "asc" ? "rotate-180" : "")}><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </th>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[80px_1fr_32px] items-center gap-3">
      <span className="text-xs font-semibold text-ink-500">{label}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${value}%` }} /></div>
      <span className="text-right text-xs font-bold tabular-nums text-ink-900">{value}</span>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-100", className)} />;
}

function SkeletonKpi() {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-ink-100" />
      </div>
      <div className="mt-4 h-8 w-20 animate-pulse rounded bg-ink-100" />
      <div className="mt-3 h-3 w-28 animate-pulse rounded bg-ink-100" />
    </div>
  );
}

/** Accessible share dialog: role=dialog, aria-modal, Escape to close, focus first control. */
function ShareDialog({ open, count, onClose, onConfirm }: { open: boolean; count: number; onClose: () => void; onConfirm: (orgName: string) => void; }) {
  const [orgId, setOrgId] = useState(organisations[0]?.id ?? "");
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => selectRef.current?.focus(), 0);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open, onClose]);

  if (!open) return null;
  const org = organisations.find((o) => o.id === orgId) ?? organisations[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="relative w-full max-w-md rounded-xl border border-ink-200 bg-white shadow-xl">
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <h2 id="share-title" className="text-lg font-bold text-ink-900">Share profiles</h2>
            <p className="mt-1 text-sm text-ink-500">Send {count} selected profile{count === 1 ? "" : "s"} to a campus organisation.</p>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700"><X size={18} /></button>
        </div>
        <div className="px-6 pb-2">
          <label htmlFor="share-org" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-500">Organisation</label>
          <select id="share-org" ref={selectRef} value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            {organisations.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.sector}</option>)}
          </select>
          {org && <p className="mt-2 text-xs text-ink-500">{org.openings} openings · {org.ctc} · drive {org.date}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-6 pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" disabled={count === 0 || !org} onClick={() => org && onConfirm(org.name)}>
            <Share2 size={14} aria-hidden="true" /> Confirm share
          </Button>
        </div>
      </div>
    </div>
  );
}
