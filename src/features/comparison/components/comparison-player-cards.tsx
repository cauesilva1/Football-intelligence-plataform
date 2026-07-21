import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import {
  buildPositionScorecard,
  soccerPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { SOCCER_RATE_MIN_MINUTES } from "@/lib/scoring";
import { getTeamTheme } from "@/lib/team-theme";
import { cn, formatCapHit, formatMarketValue, ratingColor } from "@/lib/utils";
import type { Player } from "@/types";

function SoccerStatStrip({ player }: { player: Player }) {
  const s = player.currentSeasonStats;
  const smallSample = s.minutesPlayed > 0 && s.minutesPlayed < SOCCER_RATE_MIN_MINUTES;
  const group = soccerPositionGroup(player.position);
  const scorecard = buildPositionScorecard(player.position, s);
  const highlight = scorecard.metrics
    .filter((m) => m.key !== "minutes" && m.key !== "apps" && m.key !== "rating")
    .slice(0, 3);

  if (highlight.length >= 3) {
    return (
      <div className="mt-3 space-y-1.5 border-t border-white/15 pt-3">
        {smallSample ? (
          <p className="text-center text-[10px] text-amber-200/90">
            Small sample ({s.minutesPlayed}&apos;) — totals, not rates
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-2 text-center">
          {highlight.map((m) => (
            <div key={m.key}>
              <p className="font-mono text-sm font-semibold tabular-nums text-white">{m.value}</p>
              <p className="text-2xs text-white/60">{m.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] text-white/45">{group} pack</p>
      </div>
    );
  }

  const xg90 = computeXGPer90(s.minutesPlayed, s.xG);
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
      <div>
        <p className="font-mono text-sm font-semibold tabular-nums text-white">
          {smallSample ? String(s.goals) : s.per90.goals.toFixed(2)}
        </p>
        <p className="text-2xs text-white/60">{smallSample ? "Goals" : "Goals/90"}</p>
      </div>
      <div>
        <p className="font-mono text-sm font-semibold tabular-nums text-white">
          {smallSample ? String(s.assists) : s.per90.assists.toFixed(2)}
        </p>
        <p className="text-2xs text-white/60">{smallSample ? "Assists" : "Ast/90"}</p>
      </div>
      <div>
        <p className="font-mono text-sm font-semibold tabular-nums text-white">
          {smallSample ? s.xG.toFixed(2) : xg90.toFixed(2)}
        </p>
        <p className="text-2xs text-white/60">{smallSample ? "xG" : "xG/90"}</p>
      </div>
    </div>
  );
}

function BasketballStatStrip({ player }: { player: Player }) {
  const s = player.currentSeasonStats;
  const pts = s.perGame?.points ?? s.points ?? 0;
  const reb = s.perGame?.rebounds ?? s.rebounds ?? 0;
  const ast = s.perGame?.assists ?? s.assists ?? 0;
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
      <div>
        <p className="font-mono text-sm font-semibold tabular-nums text-white">{pts.toFixed(1)}</p>
        <p className="text-2xs text-white/60">PPG</p>
      </div>
      <div>
        <p className="font-mono text-sm font-semibold tabular-nums text-white">{reb.toFixed(1)}</p>
        <p className="text-2xs text-white/60">RPG</p>
      </div>
      <div>
        <p className="font-mono text-sm font-semibold tabular-nums text-white">{ast.toFixed(1)}</p>
        <p className="text-2xs text-white/60">APG</p>
      </div>
    </div>
  );
}

export function ComparisonPlayerCards({ players }: { players: [Player, Player] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {players.map((p, index) => {
        const s = p.currentSeasonStats;
        const isBasketball = p.sport === "BASKETBALL" || s.sport === "BASKETBALL";
        const theme = getTeamTheme(p.competitionName, p.teamName);
        const valueLabel = isBasketball
          ? formatCapHit(p.capHit ?? 0)
          : formatMarketValue(p.marketValue);

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
              <Link
                href={`/players/${p.id}`}
                className={buttonVariants({ variant: "ghost", size: "xs" })}
              >
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
                  <p className="truncate font-display text-base font-semibold text-white">
                    {p.fullName}
                  </p>
                  <p className="text-xs text-white/75">
                    {p.position} · {p.nationality} · {p.age} yrs
                  </p>
                  <p className="truncate text-2xs text-white/60">{p.teamName ?? "No team"}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`font-display text-2xl font-bold tabular-nums ${ratingColor(s.rating)}`}
                >
                  {s.rating.toFixed(1)}
                </p>
                <p className="text-2xs text-white/60">{valueLabel}</p>
              </div>
            </div>
            {isBasketball ? <BasketballStatStrip player={p} /> : <SoccerStatStrip player={p} />}
          </div>
        );
      })}
    </div>
  );
}
