import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import {
  fetchNbaGroupedStandings,
  type NbaStandingRow,
} from "@/lib/api/espn-nba-standings";
import { fetchNcaaGroupedStandings } from "@/lib/api/espn-ncaa-standings";
import { resolveNbaHubSeasonYears } from "@/lib/api/espn-nba-leaders";
import type { AggregatedTeamStats } from "@/lib/statsbomb/aggregate-team-stats";
import type { Competition, TeamStatistic } from "@/types";
import { toDisplayStatsFromAggregated } from "@/lib/team-live-stats";

function isNbaCompetition(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n === "nba" || n.includes("national basketball");
}

function isNcaaCompetition(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("ncaa") || n.includes("college basketball");
}

function standingToAggregated(
  row: NbaStandingRow,
  seasonLabel: string,
  sourceLabel: string
): AggregatedTeamStats {
  const matchesPlayed = row.wins + row.losses;
  return {
    teamName: row.teamName,
    wins: row.wins,
    draws: 0,
    losses: row.losses,
    goalsFor: Math.round(row.pointsForAvg ?? 0),
    goalsAgainst: Math.round(row.pointsAgainstAvg ?? 0),
    matchesPlayed,
    goalBalance: Math.round((row.pointsForAvg ?? 0) - (row.pointsAgainstAvg ?? 0)),
    seasonLabel,
    statsBombCompetitionName: sourceLabel,
  };
}

function findStanding(
  rows: NbaStandingRow[],
  teamName: string
): NbaStandingRow | undefined {
  const exact = rows.find((r) => r.teamName.toLowerCase() === teamName.toLowerCase());
  if (exact) return exact;
  return rows.find((r) => namesLikelyMatch(r.teamName, teamName));
}

let nbaStandingsCache:
  | { seasonLabel: string; rows: NbaStandingRow[]; fetchedAt: number }
  | null = null;
let ncaaStandingsCache:
  | { seasonLabel: string; rows: NbaStandingRow[]; fetchedAt: number }
  | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadNbaRows(): Promise<{ seasonLabel: string; rows: NbaStandingRow[] }> {
  if (nbaStandingsCache && Date.now() - nbaStandingsCache.fetchedAt < CACHE_TTL_MS) {
    return nbaStandingsCache;
  }
  const { defaultYear, pastYear } = resolveNbaHubSeasonYears();
  let payload = await fetchNbaGroupedStandings(defaultYear);
  if (!payload.groups.some((g) => g.rows.length > 0)) {
    payload = await fetchNbaGroupedStandings(pastYear);
  }
  const rows = payload.groups.flatMap((g) => g.rows);
  nbaStandingsCache = {
    seasonLabel: payload.seasonLabel,
    rows,
    fetchedAt: Date.now(),
  };
  return nbaStandingsCache;
}

async function loadNcaaRows(): Promise<{ seasonLabel: string; rows: NbaStandingRow[] }> {
  if (ncaaStandingsCache && Date.now() - ncaaStandingsCache.fetchedAt < CACHE_TTL_MS) {
    return ncaaStandingsCache;
  }
  const { defaultYear, pastYear } = resolveNbaHubSeasonYears();
  let payload = await fetchNcaaGroupedStandings(defaultYear);
  if (!payload.groups.some((g) => g.rows.length > 0)) {
    payload = await fetchNcaaGroupedStandings(pastYear);
  }
  const rows = payload.groups.flatMap((g) => g.rows);
  ncaaStandingsCache = {
    seasonLabel: payload.seasonLabel,
    rows,
    fetchedAt: Date.now(),
  };
  return ncaaStandingsCache;
}

/** Attaches ESPN W-L standings for NBA / NCAA franchise pages. */
export async function attachBasketballTeamLiveStats<
  T extends { id?: string; name: string; competition?: Competition; stats?: TeamStatistic },
>(teams: T[]): Promise<(T & { statsBomb?: AggregatedTeamStats; stats?: TeamStatistic })[]> {
  const needsNba = teams.some((t) => isNbaCompetition(t.competition?.name));
  const needsNcaa = teams.some((t) => isNcaaCompetition(t.competition?.name));

  const [nba, ncaa] = await Promise.all([
    needsNba ? loadNbaRows() : Promise.resolve(null),
    needsNcaa ? loadNcaaRows() : Promise.resolve(null),
  ]);

  return teams.map((team) => {
    const competitionName = team.competition?.name;
    let row: NbaStandingRow | undefined;
    let seasonLabel = "";
    let source = "";

    if (isNbaCompetition(competitionName) && nba) {
      row = findStanding(nba.rows, team.name);
      seasonLabel = nba.seasonLabel;
      source = "NBA · ESPN";
    } else if (isNcaaCompetition(competitionName) && ncaa) {
      row = findStanding(ncaa.rows, team.name);
      seasonLabel = ncaa.seasonLabel;
      source = "NCAA · ESPN";
    }

    if (!row) return { ...team };

    const statsBomb = standingToAggregated(row, seasonLabel, source);
    return {
      ...team,
      statsBomb,
      stats: toDisplayStatsFromAggregated(statsBomb),
    };
  });
}
