import { LucideIcon } from "lucide-react";
import { MetricCard, type MetricAccent } from "@/components/data/metric-card";

const accentMap: Record<"pitch" | "azure" | "amber" | "rose", MetricAccent> = {
  pitch: "primary",
  azure: "info",
  amber: "warning",
  rose: "negative",
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = "pitch",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  accent?: "pitch" | "azure" | "amber" | "rose";
}) {
  return (
    <MetricCard
      label={label}
      value={value}
      icon={icon}
      trend={trend}
      accent={accentMap[accent]}
    />
  );
}
