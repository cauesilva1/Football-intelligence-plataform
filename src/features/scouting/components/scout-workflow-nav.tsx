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
        "flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface-muted/30 px-3 py-2 text-xs",
        className
      )}
    >
      {STEPS.map((step, index) => {
        const active = step.id === current;
        return (
          <span key={step.id} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span className="text-muted-foreground/50" aria-hidden>
                →
              </span>
            ) : null}
            <Link
              href={step.href}
              className={cn(
                "rounded-md px-2 py-1 font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              )}
              aria-current={active ? "step" : undefined}
            >
              {step.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
