import { cn } from "@/lib/utils";

/**
 * Lightweight, dependency-free tooltip. Pure CSS visibility driven by
 * hover/focus-within so it works for both mouse and keyboard users. Wrap a
 * focusable trigger (button/link) for full keyboard accessibility.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const pos =
    side === "bottom"
      ? "top-full mt-2 before:bottom-full before:-mb-1"
      : "bottom-full mb-2 before:top-full before:-mt-1";
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          "before:absolute before:left-1/2 before:h-2 before:w-2 before:-translate-x-1/2 before:rotate-45 before:bg-ink-900",
          pos
        )}
      >
        {label}
      </span>
    </span>
  );
}
