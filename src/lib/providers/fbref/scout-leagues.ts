import {
  API_FOOTBALL_EUROPEAN_SEASON_YEAR,
  API_FOOTBALL_MLS_SEASON_YEAR,
  ESPN_MLS_SLUG,
} from "@/lib/seasons";

export interface FbrefScoutLeague {
  leagueKey: string;
  competitionName: string;
  compId: number;
  /** Path segment, e.g. `2026` or `2026-2027`. */
  seasonPath: string;
  /** Page slug, e.g. `Premier-League`. */
  slug: string;
  season: number;
  /** Calendar leagues stay `2026`. European leagues display `2026/27`. */
  seasonLabel: string;
}

const european = API_FOOTBALL_EUROPEAN_SEASON_YEAR;

export const FBREF_SCOUT_LEAGUES: FbrefScoutLeague[] = [
  {
    leagueKey: ESPN_MLS_SLUG,
    competitionName: "MLS",
    compId: 22,
    seasonPath: String(API_FOOTBALL_MLS_SEASON_YEAR),
    slug: "Major-League-Soccer",
    season: API_FOOTBALL_MLS_SEASON_YEAR,
    seasonLabel: String(API_FOOTBALL_MLS_SEASON_YEAR),
  },
  {
    leagueKey: "eng.1",
    competitionName: "Premier League",
    compId: 9,
    seasonPath: `${european}-${european + 1}`,
    slug: "Premier-League",
    season: european,
    seasonLabel: `${european}/${String(european + 1).slice(2)}`,
  },
  {
    leagueKey: "esp.1",
    competitionName: "La Liga",
    compId: 12,
    seasonPath: `${european}-${european + 1}`,
    slug: "La-Liga",
    season: european,
    seasonLabel: `${european}/${String(european + 1).slice(2)}`,
  },
  {
    leagueKey: "ita.1",
    competitionName: "Serie A",
    compId: 11,
    seasonPath: `${european}-${european + 1}`,
    slug: "Serie-A",
    season: european,
    seasonLabel: `${european}/${String(european + 1).slice(2)}`,
  },
  {
    leagueKey: "ger.1",
    competitionName: "Bundesliga",
    compId: 20,
    seasonPath: `${european}-${european + 1}`,
    slug: "Bundesliga",
    season: european,
    seasonLabel: `${european}/${String(european + 1).slice(2)}`,
  },
  {
    leagueKey: "fra.1",
    competitionName: "Ligue 1",
    compId: 13,
    seasonPath: `${european}-${european + 1}`,
    slug: "Ligue-1",
    season: european,
    seasonLabel: `${european}/${String(european + 1).slice(2)}`,
  },
];

export function fbrefScoutLeague(leagueKey: string): FbrefScoutLeague | null {
  return FBREF_SCOUT_LEAGUES.find((league) => league.leagueKey === leagueKey) ?? null;
}

export function fbrefLeagueKeyForCompetition(name: string | null | undefined): string | null {
  const normalized = name?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  const league = FBREF_SCOUT_LEAGUES.find(
    (item) => item.competitionName.toLowerCase() === normalized
  );
  return league?.leagueKey ?? null;
}
