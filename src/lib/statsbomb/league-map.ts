/** Maps DB competition names → StatsBomb open-data season source. */
export interface StatsBombLeagueSource {
  competitionId: number;
  seasonId: number;
  seasonLabel: string;
  statsBombCompetitionName: string;
}

const LEAGUE_SOURCES: Array<{ match: (name: string) => boolean; source: StatsBombLeagueSource }> = [
  {
    match: (n) => n.includes("premier"),
    source: {
      competitionId: 2,
      seasonId: 27,
      seasonLabel: "2015/2016",
      statsBombCompetitionName: "Premier League",
    },
  },
  {
    match: (n) =>
      n.includes("la liga") || (n.includes("liga") && !n.includes("bundesliga") && !n.includes("brasileir")),
    source: {
      competitionId: 11,
      seasonId: 90,
      seasonLabel: "2020/2021",
      statsBombCompetitionName: "La Liga",
    },
  },
  {
    match: (n) => n.includes("bundesliga"),
    source: {
      competitionId: 9,
      seasonId: 281,
      seasonLabel: "2023/2024",
      statsBombCompetitionName: "1. Bundesliga",
    },
  },
  {
    match: (n) => n.includes("serie a") && !n.includes("brasileir"),
    source: {
      competitionId: 12,
      seasonId: 27,
      seasonLabel: "2015/2016",
      statsBombCompetitionName: "Serie A",
    },
  },
  {
    match: (n) => n.includes("ligue 1") || n.includes("ligue"),
    source: {
      competitionId: 7,
      seasonId: 235,
      seasonLabel: "2022/2023",
      statsBombCompetitionName: "Ligue 1",
    },
  },
];

export function resolveStatsBombLeague(competitionName?: string | null): StatsBombLeagueSource | null {
  const normalized = competitionName?.toLowerCase().trim() ?? "";
  if (!normalized) return null;
  return LEAGUE_SOURCES.find((entry) => entry.match(normalized))?.source ?? null;
}

export function leagueCacheKey(source: StatsBombLeagueSource): string {
  return `${source.competitionId}:${source.seasonId}`;
}
