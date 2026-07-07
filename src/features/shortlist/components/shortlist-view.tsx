import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { RemoveFromShortlistButton } from "@/features/shortlist/components/remove-from-shortlist-button";
import { queryShortlistPlayers } from "@/features/shortlist/queries/shortlist";
import type { PlayerFilters } from "@/types";

const TABLE_FILTERS: PlayerFilters = {
  sortBy: "rating",
  sortDir: "desc",
  page: 1,
  pageSize: 50,
};

export async function ShortlistView() {
  const players = await queryShortlistPlayers();

  if (players.length === 0) {
    return (
      <>
        <PageHeader
          title="My Players"
          description="Sua shortlist pessoal de jogadores monitorados."
        />
        <EmptyState
          title="Shortlist vazia"
          description="Salve jogadores a partir do perfil para acompanhar prospects e alvos de scouting."
          action={{ label: "Explorar jogadores", href: "/players" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My Players"
        description={`${players.length} jogador(es) na sua shortlist pessoal.`}
      />
      <div className="space-y-3">
        <ScoutingTable
          players={players}
          filters={TABLE_FILTERS}
          basePath="/shortlist"
          route="players"
        />
        <p className="text-2xs text-muted-foreground">
          Dica: use &quot;Remover&quot; no perfil do jogador ou os botões abaixo em cada linha.
        </p>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-xs"
            >
              <Link href={`/players/${p.id}`} className="text-foreground hover:text-primary">
                {p.knownAs}
              </Link>
              <RemoveFromShortlistButton playerId={p.id} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
