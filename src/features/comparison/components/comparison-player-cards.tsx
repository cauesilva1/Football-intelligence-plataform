import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import { getTeamTheme } from "@/lib/team-theme";
import { cn, formatMarketValue, ratingColor } from "@/lib/utils";
import type { Player } from "@/types";

export function ComparisonPlayerCards({ players }: { players: [Player, Player] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {players.map((p, index) => {
        const s = p.currentSeasonStats;
        const xg90 = computeXGPer90(s.minutesPlayed, s.xG);
        const theme = getTeamTheme(p.competitionName, p.teamName);

        return (
          <div
            key={p.id}
            className={cn(
              "overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-panel",
              theme.gradientString
            )}
            style={{ borderColor: `${theme.primaryColor}44` }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <Badge variant={index === 0 ? "default" : "azure"}>
                Player {index === 0 ? "A" : "B"}
              </Badge>
              <Link href={`/players/${p.id}`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
                View profile
              </Link>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <PlayerAvatar
                  name={p.knownAs}
                  fullName={p.fullName}
                  position={p.position}
                  competitionName={p.competitionName}
                  teamName={p.teamName}
                  photoUrl={p.photoUrl}
                  apiSportsPlayerId={p.apiSportsId}
                  size="md"
                  className="ring-2 ring-white/20"
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-white">{p.fullName}</p>
                  <p className="text-xs text-white/75">
                    {p.position} · {p.nationality} · {p.age} years old
                  </p>
                  <p className="truncate text-2xs text-white/60">{p.teamName ?? "No club"}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-display text-2xl font-bold tabular-nums ${ratingColor(s.rating)}`}>
                  {s.rating.toFixed(1)}
                </p>
                <p className="text-2xs text-white/60">{formatMarketValue(p.marketValue)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
              <div>
                <p className="font-mono text-sm font-semibold tabular-nums text-white">{s.per90.goals.toFixed(2)}</p>
                <p className="text-2xs text-white/60">Goals/90</p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold tabular-nums text-white">{s.per90.assists.toFixed(2)}</p>
                <p className="text-2xs text-white/60">Ast/90</p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold tabular-nums text-white">{xg90.toFixed(2)}</p>
                <p className="text-2xs text-white/60">xG/90</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
