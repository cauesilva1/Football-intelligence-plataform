import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { DataPanel } from "@/components/data/data-panel";
import { GoalsBarChart } from "@/components/charts/goals-bar-chart";
import { RatingTrendChart } from "@/components/charts/rating-trend-chart";

export async function DashboardChartsSection() {
  const overview = await queryDashboardOverview();
  const latest = overview.ratingTrend[overview.ratingTrend.length - 1];
  const changeLabel =
    overview.ratingChange >= 0
      ? `+${overview.ratingChange.toFixed(2)} vs temporada anterior`
      : `${overview.ratingChange.toFixed(2)} vs temporada anterior`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DataPanel title="Gols por posição" description="Distribuição ofensiva agregada na temporada." density="dense">
        <GoalsBarChart data={overview.goalsByPosition} />
      </DataPanel>
      <DataPanel
        title="Evolução do rating médio"
        description={`${latest?.season ?? "—"} · ${latest?.avgRating.toFixed(2)} (${changeLabel})`}
        density="dense"
      >
        <RatingTrendChart data={overview.ratingTrend} />
      </DataPanel>
    </div>
  );
}
