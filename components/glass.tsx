import { ReactNode } from "react";

export function Glass({
  children,
  className = "",
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={`${strong ? "card" : "card"} ${className}`}>{children}</div>
  );
}

export function Section({
  title,
  hint,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative ${className}`}>
      {title && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="section-title">{title}</div>
            {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}
