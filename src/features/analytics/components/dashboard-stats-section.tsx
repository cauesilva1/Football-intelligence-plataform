import { Users, Sparkles, Calendar, Star, TrendingUp } from "lucide-react";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { MetricCard } from "@/components/data/metric-card";
import { appConfig } from "@/lib/config";

export async function DashboardStatsSection() {
  const overview = await queryDashboardOverview();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <MetricCard
        label="Total Players"
        value={String(overview.totalPlayers)}
        icon={Users}
        accent="info"
        trend={`${appConfig.season} database`}
      />
      <MetricCard
        label="Top Prospects"
        value={String(overview.topProspectsCount)}
        icon={Sparkles}
        accent="primary"
        trend="U23 · rating ≥ 7.0"
      />
      <MetricCard
        label="Average Age"
        value={overview.avgAge.toFixed(1)}
        icon={Calendar}
        accent="warning"
        trend={`${overview.totalTeams} clubs`}
      />
      <MetricCard
        label="Best Performers"
        value={String(overview.bestPerformersCount)}
        icon={Star}
        accent="info"
        trend="Rating ≥ 7.5"
      />
      <MetricCard
        label="Market Opportunities"
        value={String(overview.marketOpportunitiesCount)}
        icon={TrendingUp}
        accent="negative"
        trend="High rating · value ≤ €8M"
      />
    </div>
  );
}
