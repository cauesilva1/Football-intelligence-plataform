import { Users, Sparkles, Calendar, Star, TrendingUp } from "lucide-react";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { MetricCard } from "@/components/data/metric-card";
import { appConfig } from "@/lib/config";
import { getServerSport } from "@/lib/sport-server";

export async function DashboardStatsSection() {
  const [overview, sport] = await Promise.all([queryDashboardOverview(), getServerSport()]);
  const isBasketball = sport === "BASKETBALL";

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
        label={isBasketball ? "Top Prospects" : "Top Prospects"}
        value={String(overview.topProspectsCount)}
        icon={Sparkles}
        accent="primary"
        trend={isBasketball ? "U23 · rating ≥ 7.0" : "U23 · rating ≥ 7.0"}
      />
      <MetricCard
        label="Average Age"
        value={overview.avgAge.toFixed(1)}
        icon={Calendar}
        accent="warning"
        trend={`${overview.totalTeams} ${isBasketball ? "franquias" : "clubs"}`}
      />
      <MetricCard
        label="Best Performers"
        value={String(overview.bestPerformersCount)}
        icon={Star}
        accent="info"
        trend="Rating ≥ 7.5"
      />
      <MetricCard
        label={isBasketball ? "Total Points (avg)" : "Market Opportunities"}
        value={
          isBasketball
            ? String(Math.round(overview.totalGoals))
            : String(overview.marketOpportunitiesCount)
        }
        icon={TrendingUp}
        accent="negative"
        trend={isBasketball ? "Soma das médias por jogo" : "High rating · value ≤ €8M"}
      />
    </div>
  );
}
