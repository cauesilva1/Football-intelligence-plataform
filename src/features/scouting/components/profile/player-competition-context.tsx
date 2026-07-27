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

/**
 * Defensive display: null means the provider never supplied the metric.
 * Legacy ESPN rows may still store 0 for missing data — keep the competition
 * heuristic as a fallback until Stage 8 enrichment rewrites them.
 */
function competitionsWithDefensiveData(rows: PlayerMatchAppearance[]): Set<string> {
  const withData = new Set<string>();
  for (const row of rows) {
    if (
      (row.tackles != null && row.tackles > 0) ||
      (row.interceptions != null && row.interceptions > 0)
    ) {
      withData.add(row.competitionLabel ?? "");
    }
  }
  return withData;
}

function formatDefCell(row: PlayerMatchAppearance, hasDefensiveData: boolean): string {
  // Honest nulls from Stage 8
  if (row.tackles == null && row.interceptions == null) {
    return "—";
  }
  if (row.tackles != null && row.interceptions != null) {
    if (row.tackles === 0 && row.interceptions === 0 && !hasDefensiveData) {
      return "—"; // legacy ESPN ambiguity
    }
    return `Tkl ${row.tackles.toFixed(0)} · Int ${row.interceptions.toFixed(0)}`;
  }
  const tkl = row.tackles != null ? `Tkl ${row.tackles.toFixed(0)}` : "Tkl —";
  const int = row.interceptions != null ? `Int ${row.interceptions.toFixed(0)}` : "Int —";
  return `${tkl} · ${int}`;
}

function SoccerAppearanceRow({
  row,
  hasDefensiveData,
}: {
  row: PlayerMatchAppearance;
  hasDefensiveData: boolean;
}) {
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
  const href = row.matchId ? `/matches/${row.matchId}` : null;

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
        {formatDefCell(row, hasDefensiveData)}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums text-primary sm:text-right">
        {row.rating != null ? row.rating.toFixed(1) : "—"}
      </span>
      {href ? (
        <Link href={href} className="text-2xs text-primary hover:underline sm:text-right">
          Match
        </Link>
      ) : (
        <span aria-hidden className="hidden text-2xs text-muted-foreground/50 sm:inline sm:text-right">
          —
        </span>
      )}
    </li>
  );
}

/** BB rows prefer native columns; fall back to soccer-column hijack. */
function BasketballAppearanceRow({ row }: { row: PlayerMatchAppearance }) {
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
  const points = row.points ?? row.goals;
  const rebounds = row.rebounds ?? row.passesCompleted;
  const steals = row.steals ?? row.tackles ?? 0;
  const blocks = row.blocks ?? row.interceptions ?? 0;

  return (
    <li className="grid grid-cols-[1fr_auto] gap-2 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[minmax(0,1.4fr)_repeat(5,auto)] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{vs}</p>
        <p className="text-2xs text-muted-foreground">
          {row.competitionLabel ?? "NBA"} · {date}
        </p>
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground sm:text-right">
        {row.minutesPlayed}&apos;
      </span>
      <span className="hidden font-mono text-xs tabular-nums sm:inline">
        {points} / {rebounds} / {row.assists}
      </span>
      <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
        Stl {Number(steals).toFixed(0)} · Blk {Number(blocks).toFixed(0)}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums text-primary sm:text-right">
        {row.rating != null ? row.rating.toFixed(1) : "—"}
      </span>
      <span aria-hidden className="hidden text-2xs text-muted-foreground/50 sm:inline sm:text-right">
        —
      </span>
    </li>
  );
}

/** AF rows prefer native columns; fall back to soccer-column hijack. */
function FootballAppearanceRow({ row }: { row: PlayerMatchAppearance }) {
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
  const passYds = row.passingYards ?? row.passesAttempted ?? 0;
  const rushYds = row.rushingYards ?? row.passesCompleted ?? 0;
  const recYds = row.receivingYards ?? 0;
  const tds = row.touchdowns ?? row.goals;
  const sacks = row.sacks ?? 0;

  return (
    <li className="grid grid-cols-[1fr_auto] gap-2 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[minmax(0,1.4fr)_repeat(5,auto)] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{vs}</p>
        <p className="text-2xs text-muted-foreground">
          {row.competitionLabel ?? "NFL"} · {date}
        </p>
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground sm:text-right">
        {row.minutesPlayed}&apos;
      </span>
      <span className="hidden font-mono text-xs tabular-nums sm:inline">
        {passYds + rushYds + recYds} yds · {tds} TD
      </span>
      <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
        Tkl {Number(row.tackles ?? 0).toFixed(0)} · Sk {Number(sacks).toFixed(1)}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums text-primary sm:text-right">
        {row.rating != null ? row.rating.toFixed(1) : "—"}
      </span>
      <span aria-hidden className="hidden text-2xs text-muted-foreground/50 sm:inline sm:text-right">
        —
      </span>
    </li>
  );
}

export async function PlayerCompetitionContext({ player }: { player: Player }) {
  const sport = player.sport ?? "SOCCER";
  if (sport !== "SOCCER" && sport !== "BASKETBALL" && sport !== "AMERICAN_FOOTBALL") {
    return null;
  }

  const [appearances, teamMatches] = await Promise.all([
    getPlayerMatchAppearances(player.id, 12),
    sport === "SOCCER" ? getRecentMatchesForTeam(player.teamId, 6) : Promise.resolve([]),
  ]);
  const competition = player.competitionName ?? player.league;
  const defensiveDataCompetitions = competitionsWithDefensiveData(appearances);

  if (appearances.length === 0 && teamMatches.length === 0) return null;

  const isBasketball = sport === "BASKETBALL";
  const isFootball = sport === "AMERICAN_FOOTBALL";

  return (
    <div className="space-y-4">
      {appearances.length > 0 ? (
        <DataPanel
          title="Recent appearances"
          description={
            isBasketball
              ? "Minutes, PTS/REB/AST, steals/blocks, and match rating from recent games."
              : isFootball
                ? "Yards, TDs, tackles/sacks, and match rating from recent games."
                : "Minutes, goals/assists, defensive actions, and match rating from recent games."
          }
          density="dense"
        >
          <div className="mb-1 hidden text-2xs uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(5,auto)] sm:gap-2">
            <span>Fixture</span>
            <span className="text-right">Min</span>
            <span>{isBasketball ? "Pts / Reb / Ast" : isFootball ? "Yds / TD" : "G / A"}</span>
            <span>{isBasketball ? "Stl / Blk" : isFootball ? "Tkl / Sk" : "Def"}</span>
            <span className="text-right">Rating</span>
            <span className="text-right"> </span>
          </div>
          <ul>
            {appearances.map((row) =>
              isBasketball ? (
                <BasketballAppearanceRow key={row.id} row={row} />
              ) : isFootball ? (
                <FootballAppearanceRow key={row.id} row={row} />
              ) : (
                <SoccerAppearanceRow
                  key={row.id}
                  row={row}
                  hasDefensiveData={defensiveDataCompetitions.has(row.competitionLabel ?? "")}
                />
              )
            )}
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
