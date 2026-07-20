import { Users, Sparkles, Calendar, Star, TrendingUp, Shield } from "lucide-react";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { MetricCard } from "@/components/data/metric-card";
import { appConfig } from "@/lib/config";
import { getServerSport } from "@/lib/sport-server";

export async function DashboardStatsSection() {
  const [overview, sport] = await Promise.all([queryDashboardOverview(), getServerSport()]);
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <MetricCard
        label="Total Players"
        value={String(overview.totalPlayers)}
        icon={Users}
        accent="info"
        trend={
          isAmericanFootball
            ? "On-demand roster sync"
            : `${appConfig.season} database`
        }
      />
      <MetricCard
        label="Top Prospects"
        value={String(overview.topProspectsCount)}
        icon={Sparkles}
        accent="primary"
        trend="U23 · rating ≥ 7.0 · ≥450'"
      />
      <MetricCard
        label="Average Age"
        value={overview.avgAge.toFixed(1)}
        icon={Calendar}
        accent="warning"
        trend={`${overview.totalTeams} ${
          isBasketball || isAmericanFootball ? "franchises" : "clubs"
        }`}
      />
      <MetricCard
        label="Best Performers"
        value={String(overview.bestPerformersCount)}
        icon={Star}
        accent="info"
        trend="Rating ≥ 7.5"
      />
      {isBasketball ? (
        <MetricCard
          label="Total Points (avg)"
          value={String(Math.round(overview.totalGoals))}
          icon={TrendingUp}
          accent="negative"
          trend="Sum of per-game averages"
        />
      ) : isAmericanFootball ? (
        <MetricCard
          label="Franchises / Programs"
          value={String(overview.totalTeams)}
          icon={Shield}
          accent="negative"
          trend={
            overview.totalPlayers === 0
              ? "Open a team to sync its roster"
              : "Cap Hit · bargains no scouting"
          }
        />
      ) : (
        <MetricCard
          label="Market Opportunities"
          value={String(overview.marketOpportunitiesCount)}
          icon={TrendingUp}
          accent="negative"
          trend="Rating ≥ 7.2 · ≤ €8M · ≥450'"
        />
      )}
    </div>
  );
}
