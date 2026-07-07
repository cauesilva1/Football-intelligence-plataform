import { Users, Sparkles, Calendar, Star, TrendingUp } from "lucide-react";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { MetricCard } from "@/components/data/metric-card";
import { appConfig } from "@/lib/config";

export async function DashboardStatsSection() {
  const overview = await queryDashboardOverview();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <MetricCard
        label="Total de jogadores"
        value={String(overview.totalPlayers)}
        icon={Users}
        accent="info"
        trend={`Base ${appConfig.season}`}
      />
      <MetricCard
        label="Top prospects"
        value={String(overview.topProspectsCount)}
        icon={Sparkles}
        accent="primary"
        trend="U23 · rating ≥ 7.0"
      />
      <MetricCard
        label="Idade média"
        value={overview.avgAge.toFixed(1)}
        icon={Calendar}
        accent="warning"
        trend={`${overview.totalTeams} clubes`}
      />
      <MetricCard
        label="Best performers"
        value={String(overview.bestPerformersCount)}
        icon={Star}
        accent="info"
        trend="Rating ≥ 7.5"
      />
      <MetricCard
        label="Market opportunities"
        value={String(overview.marketOpportunitiesCount)}
        icon={TrendingUp}
        accent="negative"
        trend="Alto rating · valor ≤ €8M"
      />
    </div>
  );
}
