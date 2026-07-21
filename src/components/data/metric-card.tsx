import type { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentClasses = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  info: "border-accent-info/20 bg-accent-info/10 text-accent-info",
  warning: "border-accent-warning/20 bg-accent-warning/10 text-accent-warning",
  negative: "border-accent-negative/20 bg-accent-negative/10 text-accent-negative",
} as const;

export type MetricAccent = keyof typeof accentClasses;

/** Compact KPI card for dashboards and profile sections. */
export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "primary",
  borderColor,
  className,
}: {
  label: ReactNode;
  value: string;
  icon?: LucideIcon;
  trend?: string;
  accent?: MetricAccent;
  borderColor?: string;
  className?: string;
}) {
  return (
    <Card
      density="dense"
      className={cn("flex h-full min-h-[5.75rem] flex-col", className)}
      style={borderColor ? { borderColor: `${borderColor}55` } : undefined}
    >
      <CardContent
        density="dense"
        className="flex h-full flex-1 items-start justify-between gap-3"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="line-clamp-2 min-h-[2rem] text-2xs font-medium uppercase leading-snug tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 font-display text-xl font-bold tabular-nums text-foreground md:text-2xl">
            {value}
          </div>
          <div className="mt-auto pt-1 text-2xs leading-snug text-muted-foreground line-clamp-2 min-h-[1.75rem]">
            {trend ?? "\u00a0"}
          </div>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              accentClasses[accent]
            )}
            style={borderColor ? { borderColor: `${borderColor}44`, color: borderColor } : undefined}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
