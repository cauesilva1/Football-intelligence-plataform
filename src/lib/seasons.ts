/** Human-readable active season label shown across the UI. */
export const CURRENT_SEASON = "2025/26";

export const SEASONS = ["2023/24", "2024/25", CURRENT_SEASON] as const;

/** API-Football `season` param for European cross-year leagues (2025/26 → 2025). */
export const API_FOOTBALL_EUROPEAN_SEASON_YEAR = 2025;

/** API-Football `season` param for calendar-year leagues (Brasileirão 2025 histórico). */
export const API_FOOTBALL_BRAZIL_SEASON_YEAR = 2025;

/** ESPN standings `season` query param for European leagues. */
export const ESPN_EUROPEAN_SEASON_YEAR = 2025;

/** ESPN `season` query param for Brasileirão — temporada histórica finalizada 2025. */
export const ESPN_BRAZIL_SEASON_YEAR = 2025;

/** Transfermarkt `season_id` para elencos retroativos do Brasileirão. */
export const TRANSFERMARKT_BRAZIL_SEASON_ID = 2025;

/** Rótulo persistido no banco para dados do Brasileirão (campanha calendário 2025). */
export const BRAZIL_SEASON_LABEL = "2025";

/**
 * API-Football free tier: `/players` squad/media endpoints only accept seasons ≤ 2024.
 * Player IDs are stable across seasons — use 2024 for photo/height/weight enrichment.
 */
export const API_FOOTBALL_PLAYER_MEDIA_SEASON = 2024;

export function isBrazilianLeague(competitionName?: string | null): boolean {
  return competitionName?.toLowerCase().includes("brasileir") ?? false;
}

/** Resolves the API-Football season year from a DB competition name. */
export function resolveApiFootballSeasonYear(competitionName?: string | null): number {
  return isBrazilianLeague(competitionName)
    ? API_FOOTBALL_BRAZIL_SEASON_YEAR
    : API_FOOTBALL_EUROPEAN_SEASON_YEAR;
}

/** Resolves the ESPN standings season year from a DB competition name. */
export function resolveEspnSeasonYear(competitionName?: string | null): number {
  return isBrazilianLeague(competitionName)
    ? ESPN_BRAZIL_SEASON_YEAR
    : ESPN_EUROPEAN_SEASON_YEAR;
}
