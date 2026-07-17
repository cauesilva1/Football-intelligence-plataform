import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { DataPanel } from "@/components/data/data-panel";
import { GoalsBarChart } from "@/components/charts/goals-bar-chart";
import { RatingTrendChart } from "@/components/charts/rating-trend-chart";
import { getServerSport } from "@/lib/sport-server";

export async function DashboardChartsSection() {
  const [overview, sport] = await Promise.all([queryDashboardOverview(), getServerSport()]);
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";
  const latest = overview.ratingTrend[overview.ratingTrend.length - 1];
  const changeLabel =
    overview.ratingChange >= 0
      ? `+${overview.ratingChange.toFixed(2)} vs previous season`
      : `${overview.ratingChange.toFixed(2)} vs previous season`;

  const chartTitle = isBasketball
    ? "Points by Position"
    : isAmericanFootball
      ? "Roster by Position"
      : "Goals by Position";

  const chartDescription = isBasketball
    ? "Sum of points-per-game averages (PPG) by position."
    : isAmericanFootball
      ? "Players synced to the database, grouped by position (QB, WR, LB…)."
      : "Aggregated offensive distribution this season.";

  const valueLabel = isBasketball ? "points" : isAmericanFootball ? "players" : "goals";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DataPanel title={chartTitle} description={chartDescription} density="dense">
        <GoalsBarChart data={overview.goalsByPosition} valueLabel={valueLabel} />
      </DataPanel>
      <DataPanel
        title={
          isBasketball || isAmericanFootball ? "Rating Trend" : "Average Rating Trend"
        }
        description={`${latest?.season ?? "—"} · ${latest?.avgRating.toFixed(2)} (${changeLabel})`}
        density="dense"
      >
        <RatingTrendChart data={overview.ratingTrend} />
      </DataPanel>
    </div>
  );
}
