export interface NhlStandingsTeam {
  abbrev: string;
  name: string;
  conference: string;
  division: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  regulationWins: number;
  regulationPlusOtWins: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface NhlDivisionGroup<T extends NhlStandingsTeam> {
  division: string;
  conference: string;
  teams: Array<T & { playoff: boolean }>;
}

export interface NhlWildCardRace<T extends NhlStandingsTeam> {
  conference: string;
  teams: T[];
}

/**
 * NHL.com regular season tie break, using only fields on the standings feed.
 * Head to head points are not in that payload, so the sort continues at goal differential.
 * Order: points, points percentage (fewer games played), regulation wins, regulation plus overtime wins, total wins, goal differential, goals for.
 */
export function compareNhlStandings(a: NhlStandingsTeam, b: NhlStandingsTeam): number {
  if (b.points !== a.points) return b.points - a.points;
  const percentage = comparePointsPercentage(a, b);
  if (percentage !== 0) return percentage;
  if (b.regulationWins !== a.regulationWins) return b.regulationWins - a.regulationWins;
  if (b.regulationPlusOtWins !== a.regulationPlusOtWins) {
    return b.regulationPlusOtWins - a.regulationPlusOtWins;
  }
  if (b.wins !== a.wins) return b.wins - a.wins;
  const diffA = a.goalsFor - a.goalsAgainst;
  const diffB = b.goalsFor - b.goalsAgainst;
  if (diffB !== diffA) return diffB - diffA;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.abbrev.localeCompare(b.abbrev);
}

function comparePointsPercentage(a: NhlStandingsTeam, b: NhlStandingsTeam): number {
  if (a.gamesPlayed <= 0 && b.gamesPlayed <= 0) return 0;
  if (a.gamesPlayed <= 0) return 1;
  if (b.gamesPlayed <= 0) return -1;
  return b.points * a.gamesPlayed - a.points * b.gamesPlayed;
}

/** Match a standings abbrev to a stored club. Exact short name only, so a fuzzy hit cannot open the wrong club. */
export function attachNhlClubIds<T extends { abbrev: string }>(
  rows: T[],
  clubs: { id: string; shortName: string | null }[]
): Array<T & { teamId?: string }> {
  const byAbbrev = new Map<string, string>();
  for (const club of clubs) {
    const key = club.shortName?.trim().toUpperCase();
    if (key && !byAbbrev.has(key)) byAbbrev.set(key, club.id);
  }
  return rows.map((row) => {
    const teamId = byAbbrev.get(row.abbrev.trim().toUpperCase());
    return teamId ? { ...row, teamId } : row;
  });
}

export function groupNhlStandings<T extends NhlStandingsTeam>(rows: T[]): {
  divisions: NhlDivisionGroup<T>[];
  wildCards: NhlWildCardRace<T>[];
} {
  const byDivision = new Map<string, T[]>();
  for (const row of rows) {
    const list = byDivision.get(row.division) ?? [];
    list.push(row);
    byDivision.set(row.division, list);
  }

  const divisions = [...byDivision.entries()]
    .map(([division, teams]) => {
      const ordered = teams.slice().sort(compareNhlStandings);
      return {
        division,
        conference: ordered[0]?.conference ?? "",
        teams: ordered.map((club, index) => ({ ...club, playoff: index < 3 })),
      };
    })
    .sort((a, b) => a.conference.localeCompare(b.conference) || a.division.localeCompare(b.division));

  const conferences = [...new Set(divisions.map((group) => group.conference))].filter(Boolean);
  const wildCards = conferences.map((conference) => {
    const pool = divisions
      .filter((group) => group.conference === conference)
      .flatMap((group) => group.teams.filter((club) => !club.playoff))
      .sort(compareNhlStandings);
    return { conference, teams: pool.slice(0, 2) };
  });

  return { divisions, wildCards };
}
