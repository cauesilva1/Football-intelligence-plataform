import type { StatsBombMatch } from "./types";

export interface AggregatedTeamStats {
  teamName: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
  goalBalance: number;
  points?: number;
  crestUrl?: string;
  /** Supabase team id when resolved — enables links to `/teams/[id]`. */
  teamId?: string;
  seasonLabel: string;
  statsBombCompetitionName: string;
}

function emptyRecord(
  teamName: string,
  seasonLabel: string,
  statsBombCompetitionName: string
): AggregatedTeamStats {
  return {
    teamName,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    matchesPlayed: 0,
    goalBalance: 0,
    seasonLabel,
    statsBombCompetitionName,
  };
}

function applyResult(
  record: AggregatedTeamStats,
  goalsFor: number,
  goalsAgainst: number
): void {
  record.matchesPlayed += 1;
  record.goalsFor += goalsFor;
  record.goalsAgainst += goalsAgainst;
  record.goalBalance = record.goalsFor - record.goalsAgainst;

  if (goalsFor > goalsAgainst) record.wins += 1;
  else if (goalsFor < goalsAgainst) record.losses += 1;
  else record.draws += 1;
}

/** Aggregates W/D/L and goals from StatsBomb match JSON. */
export function aggregateTeamStatsFromMatches(
  matches: StatsBombMatch[],
  seasonLabel: string,
  statsBombCompetitionName: string
): Map<string, AggregatedTeamStats> {
  const table = new Map<string, AggregatedTeamStats>();

  for (const match of matches) {
    const homeName = match.home_team.home_team_name;
    const awayName = match.away_team.away_team_name;
    const homeScore = match.home_score ?? 0;
    const awayScore = match.away_score ?? 0;

    const home =
      table.get(homeName) ?? emptyRecord(homeName, seasonLabel, statsBombCompetitionName);
    const away =
      table.get(awayName) ?? emptyRecord(awayName, seasonLabel, statsBombCompetitionName);

    applyResult(home, homeScore, awayScore);
    applyResult(away, awayScore, homeScore);

    table.set(homeName, home);
    table.set(awayName, away);
  }

  return table;
}

const NAME_ALIASES: Record<string, string> = {
  "manchester utd": "manchester united",
  "man utd": "manchester united",
  "man city": "manchester city",
  "newcastle utd": "newcastle united",
  "nott'm forest": "nottingham forest",
  "nottingham forest": "nottingham forest",
  "wolverhampton wanderers": "wolves",
  "brighton and hove albion": "brighton",
  "tottenham hotspur": "tottenham",
  "spurs": "tottenham",
  "inter milan": "inter",
  "ac milan": "milan",
  "atletico madrid": "atlético madrid",
  "athletic club": "athletic bilbao",
  "paris saint-germain": "paris s-g",
  "psg": "paris s-g",
  flamengo: "flamengo",
  palmeiras: "palmeiras",
  "sao paulo": "são paulo",
  corinthians: "corinthians",
};

function normalizeTeamKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findStatsBombStatsForTeam(
  table: Map<string, AggregatedTeamStats>,
  dbTeamName: string
): AggregatedTeamStats | null {
  if (table.has(dbTeamName)) return table.get(dbTeamName)!;

  const normalizedDb = normalizeTeamKey(dbTeamName);
  const alias = NAME_ALIASES[normalizedDb];
  const searchKey = alias ? normalizeTeamKey(alias) : normalizedDb;

  for (const [name, stats] of table.entries()) {
    const normalizedName = normalizeTeamKey(name);
    if (
      normalizedName === searchKey ||
      normalizedName.includes(searchKey) ||
      searchKey.includes(normalizedName)
    ) {
      return stats;
    }
  }

  return null;
}
