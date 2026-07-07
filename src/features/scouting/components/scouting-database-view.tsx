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
        title={
          route === "scouting"
            ? "Nenhum jogador atende aos critérios"
            : "Nenhum jogador encontrado"
        }
        description="Nenhuma combinação de filtros retornou resultados. Amplie os critérios ou limpe os filtros ativos."
        action={{ label: "Limpar todos os filtros", href: basePath }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <ScoutingTable players={result.items} filters={filters} basePath={basePath} route={route} />
      <ScoutingPagination result={result} filters={filters} basePath={basePath} route={route} />
    </div>
  );
}
