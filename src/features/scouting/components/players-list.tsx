import { queryPlayers } from "@/features/scouting/queries/players";
import { EmptyState } from "@/components/common/empty-state";
import { PlayersTable } from "./players-table";
import { PlayersPagination } from "./players-pagination";
import type { PlayerFilters } from "@/types";

export async function PlayersList({ filters }: { filters: PlayerFilters }) {
  const result = await queryPlayers(filters);

  if (result.items.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <PlayersTable players={result.items} />
      <PlayersPagination result={result} filters={filters} />
    </>
  );
}
