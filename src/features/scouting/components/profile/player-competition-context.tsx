import Link from "next/link";
import { DataPanel } from "@/components/data/data-panel";
import {
  getRecentMatchesForTeam,
  type PlayerRecentMatch,
} from "@/features/scouting/queries/player-recent-matches";
import {
  getPlayerMatchAppearances,
  type PlayerMatchAppearance,
} from "@/features/scouting/queries/player-match-appearances";
import type { Player } from "@/types";

function TeamMatchRow({ match }: { match: PlayerRecentMatch }) {
  const date = new Date(match.matchDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const score = `${match.homeScore}–${match.awayScore}`;
  const fixture = `${match.homeTeamName} ${score} ${match.awayTeamName}`;

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{fixture}</p>
        <p className="text-2xs text-muted-foreground">
          {match.competitionName ?? "Competition"}
          {match.round ? ` · ${match.round}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 text-2xs text-muted-foreground">
        <span>{date}</span>
        <Link href={`/matches/${match.id}`} className="text-primary hover:underline">
          Match
        </Link>
      </div>
    </li>
  );
}

function AppearanceRow({ row }: { row: PlayerMatchAppearance }) {
  const date = row.matchDate
    ? new Date(row.matchDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const vs =
    row.opponentName != null
      ? `${row.isHome ? "vs" : "@"} ${row.opponentName}`
      : row.teamName ?? "Appearance";
  const href = row.matchId
    ? `/matches/${row.matchId}`
    : `/matches/${encodeURIComponent(row.externalEventKey)}`;

  return (
    <li className="grid grid-cols-[1fr_auto] gap-2 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[minmax(0,1.4fr)_repeat(5,auto)] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{vs}</p>
        <p className="text-2xs text-muted-foreground">
          {row.competitionLabel ?? "Match"} · {date}
        </p>
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground sm:text-right">
        {row.minutesPlayed}&apos;
      </span>
      <span className="hidden font-mono text-xs tabular-nums sm:inline">
        G {row.goals} · A {row.assists}
      </span>
      <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
        Tkl {row.tackles.toFixed(0)} · Int {row.interceptions.toFixed(0)}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums text-primary sm:text-right">
        {row.rating != null ? row.rating.toFixed(1) : "—"}
      </span>
      <Link href={href} className="text-2xs text-primary hover:underline sm:text-right">
        Match
      </Link>
    </li>
  );
}

export async function PlayerCompetitionContext({ player }: { player: Player }) {
  if ((player.sport ?? "SOCCER") !== "SOCCER") return null;

  const [appearances, teamMatches] = await Promise.all([
    getPlayerMatchAppearances(player.id, 12),
    getRecentMatchesForTeam(player.teamId, 6),
  ]);
  const competition = player.competitionName ?? player.league;

  // Only show the appearances panel when we have real per-match rows — never ops/empty noise.
  if (appearances.length === 0 && teamMatches.length === 0) return null;

  return (
    <div className="space-y-4">
      {appearances.length > 0 ? (
        <DataPanel
          title="Recent appearances"
          description="Minutes, goals/assists, defensive actions, and match rating from recent games."
          density="dense"
        >
          <div className="mb-1 hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(5,auto)] sm:gap-2">
            <span>Fixture</span>
            <span className="text-right">Min</span>
            <span>G / A</span>
            <span>Def</span>
            <span className="text-right">Rating</span>
            <span className="text-right"> </span>
          </div>
          <ul>
            {appearances.map((row) => (
              <AppearanceRow key={row.id} row={row} />
            ))}
          </ul>
        </DataPanel>
      ) : null}

      {teamMatches.length > 0 ? (
        <DataPanel
          title="Competition context"
          description={
            competition
              ? `${competition} — recent club fixtures.`
              : "Recent club fixtures for this player."
          }
          density="dense"
        >
          <ul>
            {teamMatches.map((m) => (
              <TeamMatchRow key={m.id} match={m} />
            ))}
          </ul>
          <p className="mt-3 text-2xs text-muted-foreground">
            Club: {player.teamName ?? "—"} · season {player.selectedSeason}
          </p>
        </DataPanel>
      ) : null}
    </div>
  );
}
