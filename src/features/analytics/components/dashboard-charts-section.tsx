import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { DataPanel } from "@/components/data/data-panel";
import { GoalsBarChart } from "@/components/charts/goals-bar-chart";
import { RatingTrendChart } from "@/components/charts/rating-trend-chart";
import { getServerSport } from "@/lib/sport-server";

export async function DashboardChartsSection() {
  const [overview, sport] = await Promise.all([queryDashboardOverview(), getServerSport()]);
  const isBasketball = sport === "BASKETBALL";
  const latest = overview.ratingTrend[overview.ratingTrend.length - 1];
  const changeLabel =
    overview.ratingChange >= 0
      ? `+${overview.ratingChange.toFixed(2)} vs previous season`
      : `${overview.ratingChange.toFixed(2)} vs previous season`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DataPanel
        title={isBasketball ? "Points by Position" : "Goals by Position"}
        description={
          isBasketball
            ? "Distribuição ofensiva agregada por posição."
            : "Aggregated offensive distribution this season."
        }
        density="dense"
      >
        <GoalsBarChart data={overview.goalsByPosition} />
      </DataPanel>
      <DataPanel
        title="Average Rating Trend"
        description={`${latest?.season ?? "—"} · ${latest?.avgRating.toFixed(2)} (${changeLabel})`}
        density="dense"
      >
        <RatingTrendChart data={overview.ratingTrend} />
      </DataPanel>
    </div>
  );
}
