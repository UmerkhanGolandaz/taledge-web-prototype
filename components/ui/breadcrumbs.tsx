import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Enterprise breadcrumb trail. The last item is the current page (not a link).
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px]">
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className="flex items-center gap-1.5">
              {it.href && !isLast ? (
                <Link href={it.href} className="font-medium text-ink-500 transition-colors hover:text-brand-700">
                  {it.label}
                </Link>
              ) : (
                <span className={isLast ? "font-semibold text-ink-700" : "font-medium text-ink-500"} aria-current={isLast ? "page" : undefined}>
                  {it.label}
                </span>
              )}
              {!isLast && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-300" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
