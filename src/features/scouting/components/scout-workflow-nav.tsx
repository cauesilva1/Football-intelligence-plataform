import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "discover", label: "Discover", href: "/scouting" },
  { id: "shortlist", label: "Shortlist", href: "/shortlist" },
  { id: "compare", label: "Compare", href: "/compare" },
  { id: "report", label: "Report", href: "/reports" },
] as const;

export type ScoutWorkflowStep = (typeof STEPS)[number]["id"];

/** Compact Discover → Shortlist → Compare → Report trail for soccer scout surfaces. */
export function ScoutWorkflowNav({
  current,
  className,
}: {
  current: ScoutWorkflowStep;
  className?: string;
}) {
  return (
    <nav
      aria-label="Scout workflow"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-muted/30 px-2.5 py-1.5 text-xs",
        className
      )}
    >
      {STEPS.map((step, index) => {
        const active = step.id === current;
        return (
          <span key={step.id} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="px-0.5 text-muted-foreground/40" aria-hidden>
                →
              </span>
            ) : null}
            <Link
              href={step.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-[color,background-color] duration-150",
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full font-mono text-[10px] tabular-nums",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-muted text-muted-foreground"
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              {step.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
