import { EmptyState } from "@/components/common/empty-state";
import { queryPlayers } from "@/features/scouting/queries/players";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { ScoutingPagination } from "@/features/scouting/components/scouting-pagination";
import type { ScoutingRoute } from "@/features/scouting/lib/filter-defaults";
import type { PlayerFilters } from "@/types";

export async function ScoutingDatabaseView({
  filters,
  basePath,
  route,
}: {
  filters: PlayerFilters;
  basePath: string;
  route: ScoutingRoute;
}) {
  const result = await queryPlayers(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon="search"
        title={
          route === "scouting"
            ? "No players match the filters."
            : "No players found."
        }
        description="No filter combination returned results. Broaden the criteria or clear the active filters."
        action={{ label: "Clear all filters", href: basePath }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="desk-results-meta">
          <strong>{result.total.toLocaleString()}</strong>{" "}
          {result.total === 1 ? "player" : "players"}
          {route === "scouting" ? " matching filters" : " in directory"}
        </p>
        <p className="text-2xs text-muted-foreground">
          Rating scale: 8+ green, 7–8 blue, 6–7 amber, below 6 rose. A dash means no sample yet.
        </p>
      </div>
      <ScoutingTable players={result.items} filters={filters} basePath={basePath} route={route} />
      <ScoutingPagination result={result} filters={filters} basePath={basePath} route={route} />
    </div>
  );
}
