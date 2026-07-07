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
      className={cn(className)}
      style={borderColor ? { borderColor: `${borderColor}55` } : undefined}
    >
      <CardContent density="dense" className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-xl font-bold tabular-nums text-foreground md:text-2xl">{value}</div>
          {trend && <div className="mt-0.5 text-2xs text-muted-foreground">{trend}</div>}
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
