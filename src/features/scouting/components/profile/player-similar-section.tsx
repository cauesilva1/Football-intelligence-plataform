import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataPanel } from "@/components/data/data-panel";
import { querySimilarPlayers } from "@/features/scouting/queries/similar-players";
import { formatCapHit, formatMarketValue, ratingColor } from "@/lib/utils";

export async function PlayerSimilarSection({ playerId }: { playerId: string }) {
  const similar = await querySimilarPlayers(playerId, 4);

  return (
    <DataPanel
      title="Similar Players"
      description="Weighted statistical profile comparison (same position)."
      density="dense"
    >
      {similar.length === 0 ? (
        <p className="text-sm text-muted-foreground">No similar players found in the current database.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {similar.map(({ player, score }) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/30 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-surface-muted/60"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="truncate text-sm font-medium text-foreground">{player.knownAs}</p>
                  <Badge variant="neutral">{player.position}</Badge>
                </div>
                <p className="mt-1 truncate text-2xs text-muted-foreground">
                  {player.teamShortName ?? "—"} · {player.age} years old
                  {player.sport === "BASKETBALL"
                    ? player.capHit
                      ? ` · ${formatCapHit(player.capHit)}`
                      : ""
                    : ` · ${formatMarketValue(player.marketValue)}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xs uppercase tracking-wider text-muted-foreground">Match</p>
                <p className="font-mono text-sm font-semibold text-primary">{Math.round(score)}%</p>
                <p className={`font-mono text-2xs ${ratingColor(player.currentSeasonStats.rating)}`}>
                  {player.currentSeasonStats.rating.toFixed(1)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DataPanel>
  );
}
