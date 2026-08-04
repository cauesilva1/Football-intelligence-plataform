import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "discover", label: "Discover", href: "/scouting" },
  { id: "shortlist", label: "Shortlist", href: "/shortlist" },
  { id: "recruitment", label: "Recruit", href: "/recruitment" },
  { id: "compare", label: "Compare", href: "/compare" },
  { id: "report", label: "Report", href: "/reports" },
] as const;

export type ScoutWorkflowStep = (typeof STEPS)[number]["id"];

/** Editorial Discover → Report trail — shared across sports. */
export function ScoutWorkflowNav({
  current,
  className,
}: {
  current: ScoutWorkflowStep;
  className?: string;
}) {
  return (
    <nav aria-label="Scout workflow" className={cn("desk-workflow", className)}>
      {STEPS.map((step, index) => {
        const active = step.id === current;
        return (
          <span key={step.id} className="desk-workflow-item">
            {index > 0 ? (
              <span className="desk-workflow-sep" aria-hidden>
                /
              </span>
            ) : null}
            <Link
              href={step.href}
              className={cn("desk-workflow-link", active && "is-active")}
              aria-current={active ? "step" : undefined}
            >
              <span className="desk-workflow-index" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              {step.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
