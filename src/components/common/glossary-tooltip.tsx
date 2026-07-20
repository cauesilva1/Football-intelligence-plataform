import { cn } from "@/lib/utils";

export function GlossaryTooltip({
  label,
  description,
  className,
  placement = "bottom",
}: {
  label: React.ReactNode;
  description: string;
  className?: string;
  placement?: "top" | "bottom";
}) {
  return (
    <div className={cn("group relative inline-flex cursor-help items-center gap-1", className)}>
      {label}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 hidden w-56 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-[11px] font-normal normal-case leading-snug text-muted-foreground shadow-panel group-hover:block",
          placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
        )}
      >
        {description}
      </div>
    </div>
  );
}

export const POSITION_GLOSSARY: Record<string, string> = {
  GK: "Goalkeeper",
  CB: "Centre-back",
  LB: "Left-back",
  RB: "Right-back",
  CDM: "Defensive midfielder",
  CM: "Central midfielder",
  CAM: "Attacking midfielder",
  LW: "Left winger",
  RW: "Right winger",
  ST: "Striker",
  FW: "Forward",
  MF: "Midfielder",
  DF: "Defender",
};

export const METRIC_GLOSSARY = {
  xG: "Expected Goals (xG): measures the probability of a shot becoming a goal based on shot quality and historical conversion.",
  xA: "Expected Assists (xA): measures the probability of a pass becoming a direct goal assist.",
  rating:
    "Prototype productivity score (soccer): ≈ 6 + goals/90×0.35 + assists/90×0.25 when minutes ≥ 450. Soft-capped rates; not a commercial provider rating.",
  valueScore:
    "Rating per €1M of estimated market value — higher means stronger performance relative to price (Hidden Gems heuristic).",
} as const;
