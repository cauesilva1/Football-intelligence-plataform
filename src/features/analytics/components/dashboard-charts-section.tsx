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
    ? "Pontos por posição"
    : isAmericanFootball
      ? "Elenco por posição"
      : "Goals by Position";

  const chartDescription = isBasketball
    ? "Soma das médias de pontos (PPG) agregada por posição."
    : isAmericanFootball
      ? "Jogadores sincronizados no banco, agrupados por posição (QB, WR, LB…)."
      : "Aggregated offensive distribution this season.";

  const valueLabel = isBasketball ? "points" : isAmericanFootball ? "players" : "goals";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DataPanel title={chartTitle} description={chartDescription} density="dense">
        <GoalsBarChart data={overview.goalsByPosition} valueLabel={valueLabel} />
      </DataPanel>
      <DataPanel
        title={
          isBasketball || isAmericanFootball ? "Tendência de rating" : "Average Rating Trend"
        }
        description={`${latest?.season ?? "—"} · ${latest?.avgRating.toFixed(2)} (${changeLabel})`}
        density="dense"
      >
        <RatingTrendChart data={overview.ratingTrend} />
      </DataPanel>
    </div>
  );
}
