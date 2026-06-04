"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { useEffect, useState } from "react";

const SHOW_PHASE_2 = false;

const phaseOneLinks = [
  { href: "/student/candidate-001", label: "Candidates" },
  { href: "/institute/institute-placement", label: "Institutes" },
  { href: "/recruiter/recruiter-001", label: "Recruiters" },
  { href: "/coach/coach-001", label: "Coaches" },
];

// Phase 2 stays in the codebase but is hidden from production navigation.
const phaseTwoLinks = [{ href: "/coach-ai", label: "AI Coach · P2" }];
const links = SHOW_PHASE_2 ? [...phaseOneLinks, ...phaseTwoLinks] : phaseOneLinks;

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Hide the global marketing nav on the focused candidate assessment flow
  // and on the landing page (which uses its own ClaimKeys-style split layout).
  const inCandidateFlow =
    pathname === "/" ||
    pathname === "/onboarding" ||
    pathname?.startsWith("/student/");
  if (inCandidateFlow) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-100 bg-white/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center text-ink-900 transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-500 md:flex">
            {links.map((l) => {
              const active = pathname?.startsWith(l.href.split("/").slice(0, 3).join("/"));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`transition-colors hover:text-ink-900 ${active ? "text-ink-900" : ""}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/onboarding"
            className="hidden text-sm font-bold text-ink-600 transition hover:text-ink-900 sm:inline-flex"
          >
            Sign In
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-black hover:shadow-md sm:px-5"
          >
            Get Started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-white text-ink-900 hover:bg-ink-50 md:hidden transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-5 py-3">
            <div className="grid grid-cols-2 gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 hover:text-ink-900 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/onboarding"
                className="col-span-2 mt-2 rounded-lg bg-ink-900 px-3 py-2.5 text-center text-sm font-bold text-white hover:bg-black transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
