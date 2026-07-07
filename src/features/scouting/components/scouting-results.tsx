import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { queryPlayers } from "@/features/scouting/queries/players";
import { formatMarketValue, ratingColor } from "@/lib/utils";
import type { PlayerFilters } from "@/types";

export async function ScoutingResults({ filters }: { filters: PlayerFilters }) {
  const result = await queryPlayers(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="Nenhum jogador atende aos critérios"
        description="Amplie os filtros de scouting para ver mais resultados."
      />
    );
  }

  return (
    <div className="space-y-2">
      {result.items.map((p, i) => (
        <Card key={p.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary font-display text-sm font-bold text-muted-foreground">
                #{i + 1}
              </div>
              <div>
                <Link href={`/players/${p.id}`} className="font-medium text-foreground hover:text-primary">
                  {p.fullName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {p.nationality} · {p.age} anos · {p.teamShortName ?? "-"}
                </p>
              </div>
              <Badge variant="secondary">{p.position}</Badge>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Gols/90</p>
                <p className="font-mono text-sm text-foreground">{p.currentSeasonStats.per90.goals.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Assist./90</p>
                <p className="font-mono text-sm text-foreground">{p.currentSeasonStats.per90.assists.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor</p>
                <p className="font-mono text-sm text-foreground">{formatMarketValue(p.marketValue)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Rating</p>
                <p className={`font-display text-lg font-bold ${ratingColor(p.currentSeasonStats.rating)}`}>
                  {p.currentSeasonStats.rating.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
