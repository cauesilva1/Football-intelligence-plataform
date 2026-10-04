import {
  buildEuroLeagueEventKey,
  type EuroLeagueGame,
} from "@/lib/api/euroleague";
import type { NbaScheduleBundle, NbaScheduleGame } from "@/lib/api/espn-nba-schedule";

export type EuroLeagueFixtureDraft = {
  externalKey: string;
  homeName: string;
  awayName: string;
  homeCode?: string;
  awayCode?: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  status: "finished" | "scheduled";
  seasonLabel: string;
};

export function euroLeagueFixtureDraft(
  game: EuroLeagueGame,
  seasonCode: string
): EuroLeagueFixtureDraft | null {
  const homeName = game.local?.club?.name?.trim();
  const awayName = game.road?.club?.name?.trim();
  const raw = game.utcDate ?? game.date;
  if (!game.gameCode || !homeName || !awayName || !raw) return null;
  const matchDate = new Date(raw);
  if (Number.isNaN(matchDate.getTime())) return null;
  const homeScore = game.local?.score ?? 0;
  const awayScore = game.road?.score ?? 0;
  const status = euroLeagueFixtureStatus(game.played, homeScore, awayScore);
  return {
    externalKey: buildEuroLeagueEventKey(seasonCode, game.gameCode),
    homeName,
    awayName,
    homeCode: game.local?.club?.code,
    awayCode: game.road?.club?.code,
    homeScore: status === "finished" ? homeScore : 0,
    awayScore: status === "finished" ? awayScore : 0,
    matchDate,
    status,
    seasonLabel: seasonCode,
  };
}

/** A played flag or a final score means the game belongs on Results. */
export function euroLeagueFixtureStatus(
  played: boolean | undefined,
  homeScore: number | null | undefined,
  awayScore: number | null | undefined
): "finished" | "scheduled" {
  if (played === true) return "finished";
  if ((homeScore ?? 0) > 0 || (awayScore ?? 0) > 0) return "finished";
  return "scheduled";
}

export type EuroLeagueScheduleRow = {
  externalKey: string;
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  homeCrest?: string;
  awayCrest?: string;
  homeScore: number;
  awayScore: number;
  status: string;
  matchDate: Date;
};

function scheduleStatus(row: EuroLeagueScheduleRow): NbaScheduleGame["status"] {
  const normalized = row.status.toLowerCase();
  if (normalized === "live") return "live";
  if (
    normalized === "finished" ||
    normalized === "final" ||
    row.homeScore > 0 ||
    row.awayScore > 0
  ) {
    return "final";
  }
  return "scheduled";
}

/** Hub rows from persisted EuroLeague matches. The id is the external key. */
export function euroLeagueMatchesToSchedule(rows: EuroLeagueScheduleRow[]): NbaScheduleBundle {
  const games: NbaScheduleGame[] = rows.map((row) => {
    const status = scheduleStatus(row);
    return {
      id: row.externalKey,
      name: `${row.awayName} @ ${row.homeName}`,
      homeTeam: row.homeName,
      awayTeam: row.awayName,
      homeAbbreviation: row.homeShort.slice(0, 3).toUpperCase(),
      awayAbbreviation: row.awayShort.slice(0, 3).toUpperCase(),
      homeLogo: row.homeCrest,
      awayLogo: row.awayCrest,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      status,
      statusLabel: status === "final" ? "Final" : status === "live" ? "Live" : "Scheduled",
      startTime: row.matchDate.toISOString(),
      competition: "euroleague",
    };
  });

  const past = games
    .filter((game) => game.status === "final")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const live = games.filter((game) => game.status === "live");
  const scheduled = games
    .filter((game) => game.status === "scheduled")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return {
    live,
    past,
    scheduled,
    fetchedAt: new Date().toISOString(),
  };
}
