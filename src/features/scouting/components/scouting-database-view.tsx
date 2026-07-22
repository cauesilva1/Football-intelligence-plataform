import { EmptyState } from "@/components/common/empty-state";
import { queryPlayers } from "@/features/scouting/queries/players";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { ScoutingPagination } from "@/features/scouting/components/scouting-pagination";
import type { ScoutingRoute } from "@/features/scouting/lib/filter-defaults";
import type { PlayerFilters } from "@/types";
import { SearchX } from "lucide-react";

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
        icon={SearchX}
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
      <div className="flex items-baseline justify-between gap-3 px-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{result.total.toLocaleString()}</span>{" "}
          {result.total === 1 ? "player" : "players"}
          {route === "scouting" ? " matching filters" : " in directory"}
        </p>
      </div>
      <ScoutingTable players={result.items} filters={filters} basePath={basePath} route={route} />
      <ScoutingPagination result={result} filters={filters} basePath={basePath} route={route} />
    </div>
  );
}
