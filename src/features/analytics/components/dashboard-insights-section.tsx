import Link from "next/link";
import { AlertTriangle, Lightbulb, TrendingUp, ChevronRight } from "lucide-react";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardInsight } from "@/types";

const insightStyles: Record<DashboardInsight["type"], { icon: typeof AlertTriangle; badge: "amber" | "azure" | "rose" }> = {
  alert: { icon: AlertTriangle, badge: "amber" },
  opportunity: { icon: Lightbulb, badge: "azure" },
  trend: { icon: TrendingUp, badge: "rose" },
};

function InsightRow({ insight }: { insight: DashboardInsight }) {
  const { icon: Icon, badge } = insightStyles[insight.type];
  const content = (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted/30 px-3 py-2.5 transition-colors",
        insight.href && "hover:border-primary/30 hover:bg-surface-muted/50"
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{insight.title}</p>
            <Badge variant={badge} className="capitalize">
              {insight.type === "alert" ? "Alerta" : insight.type === "opportunity" ? "Oportunidade" : "Tendência"}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{insight.description}</p>
        </div>
      </div>
      {insight.href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </div>
  );

  if (insight.href) {
    return <Link href={insight.href}>{content}</Link>;
  }
  return content;
}

export async function DashboardInsightsSection() {
  const overview = await queryDashboardOverview();

  return (
    <DataPanel
      title="Insights executivos"
      description="Alertas e oportunidades gerados a partir da base monitorada."
      density="dense"
    >
      <div className="grid gap-2 lg:grid-cols-2">
        {overview.insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} />
        ))}
      </div>
    </DataPanel>
  );
}
