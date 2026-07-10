import { ScoutingFiltersPanel } from "@/features/scouting/components/scouting-filters-panel";
import { queryScoutingFilterOptions } from "@/features/scouting/queries/filter-options";
import { getServerSport } from "@/lib/sport-server";
import type { ScoutingRoute } from "@/features/scouting/lib/filter-defaults";

export async function ScoutingFiltersPanelLoader({
  basePath,
  route,
}: {
  basePath: string;
  route: ScoutingRoute;
}) {
  const sport = await getServerSport();
  const { leagues, teams } = await queryScoutingFilterOptions(sport);

  return (
    <ScoutingFiltersPanel basePath={basePath} route={route} leagues={leagues} teams={teams} />
  );
}
