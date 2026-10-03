import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { DataPanel } from "@/components/data/data-panel";
import {
  LazyGoalsBarChart,
  LazyRatingTrendChart,
} from "@/features/analytics/components/lazy-dashboard-charts";
import { getServerSport } from "@/lib/sport-server";

export async function DashboardChartsSection() {
  const [overview, sport] = await Promise.all([queryDashboardOverview(), getServerSport()]);
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";
  const latest = overview.ratingTrend[overview.ratingTrend.length - 1];
  const trendReady = overview.ratingTrend.length >= 2;
  const changeLabel = !trendReady
    ? "this season"
    : overview.ratingChange >= 0
      ? `+${overview.ratingChange.toFixed(2)} vs previous season`
      : `${overview.ratingChange.toFixed(2)} vs previous season`;

  const chartTitle = isBasketball
    ? "Points by Position"
    : isAmericanFootball
      ? "Roster by Position"
      : "Goals per 90 by Role";

  const chartDescription = isBasketball
    ? "Sum of points-per-game averages (PPG) by position."
    : isAmericanFootball
      ? "Players synced to the database, grouped by position (QB, WR, LB…)."
      : "Mean goals per 90 for goalkeepers, defenders, midfielders, and attackers in this sample (at least 270 minutes).";

  const valueLabel = isBasketball ? "points" : isAmericanFootball ? "players" : "g/90";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DataPanel title={chartTitle} description={chartDescription} density="dense">
        <LazyGoalsBarChart data={overview.goalsByPosition} valueLabel={valueLabel} />
      </DataPanel>
      <DataPanel
        title={
          isBasketball || isAmericanFootball ? "Rating Trend" : "Average Rating Trend"
        }
        description={
          latest
            ? `${latest.season} · ${latest.avgRating.toFixed(2)} (${changeLabel})`
            : "No season ratings on file."
        }
        density="dense"
      >
        {trendReady ? (
          <LazyRatingTrendChart data={overview.ratingTrend} />
        ) : (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">
            {latest
              ? "One season is on file. The figure above is that season's average."
              : "No rated seasons are on file for this sample."}
          </p>
        )}
      </DataPanel>
    </div>
  );
}
