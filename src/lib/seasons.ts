/** Human-readable active season label shown across the UI. */
export const CURRENT_SEASON = "2025/26";

export const SEASONS = ["2023/24", "2024/25", CURRENT_SEASON] as const;

/** API-Football `season` param for European cross-year leagues (2025/26 → 2025). */
export const API_FOOTBALL_EUROPEAN_SEASON_YEAR = 2025;

/** API-Football `season` param for calendar-year leagues (Brasileirão / MLS 2026). */
export const API_FOOTBALL_BRAZIL_SEASON_YEAR = 2026;
export const API_FOOTBALL_MLS_SEASON_YEAR = 2026;

/** ESPN standings `season` query param for European leagues. */
export const ESPN_EUROPEAN_SEASON_YEAR = 2025;

/** ESPN `season` query param for Brasileirão — temporada 2026 em andamento. */
export const ESPN_BRAZIL_SEASON_YEAR = 2026;

/** ESPN `season` para MLS (calendário 2026). */
export const ESPN_MLS_SEASON_YEAR = 2026;
export const ESPN_MLS_SLUG = "usa.1";
export const MLS_LABEL = "MLS";
export const MLS_SEASON_LABEL = "2026";

/** Transfermarkt `season_id` para elencos do Brasileirão / MLS. */
export const TRANSFERMARKT_BRAZIL_SEASON_ID = 2026;
export const TRANSFERMARKT_MLS_SEASON_ID = 2026;

/** Rótulo persistido no banco para dados do Brasileirão (campanha calendário 2026). */
export const BRAZIL_SEASON_LABEL = "2026";

/** ESPN slug + season para a Copa do Mundo 2026 (torneio em andamento). */
export const FIFA_WORLD_CUP_SLUG = "fifa.world";
export const FIFA_WORLD_CUP_SEASON_YEAR = 2026;
export const FIFA_WORLD_CUP_SEASON_LABEL = "2026";
export const FIFA_WORLD_CUP_LABEL = "FIFA World Cup";

export function isWorldCupCompetition(competitionName?: string | null): boolean {
  const normalized = competitionName?.toLowerCase() ?? "";
  return normalized.includes("world cup") || normalized.includes("fifa.world");
}

/**
 * API-Football free tier: `/players` squad/media endpoints only accept seasons ≤ 2024.
 * Player IDs are stable across seasons — use 2024 for photo/height/weight enrichment.
 */
export const API_FOOTBALL_PLAYER_MEDIA_SEASON = 2024;

export function isBrazilianLeague(competitionName?: string | null): boolean {
  return competitionName?.toLowerCase().includes("brasileir") ?? false;
}

export function isMlsLeague(competitionName?: string | null): boolean {
  const n = competitionName?.toLowerCase() ?? "";
  return n.includes("mls") || n.includes("major league soccer") || n.includes("usa.1");
}

/** Calendar-year domestic leagues (not European cross-year). */
export function isCalendarYearLeague(competitionName?: string | null): boolean {
  return isBrazilianLeague(competitionName) || isMlsLeague(competitionName);
}

/** Season label used when persisting TeamStatistic / Match for a competition. */
export function resolvePersistedSeasonLabel(competitionName?: string | null): string {
  if (isWorldCupCompetition(competitionName)) return FIFA_WORLD_CUP_SEASON_LABEL;
  if (isMlsLeague(competitionName)) return MLS_SEASON_LABEL;
  if (isBrazilianLeague(competitionName)) return BRAZIL_SEASON_LABEL;
  return CURRENT_SEASON;
}

/** Resolves the API-Football season year from a DB competition name. */
export function resolveApiFootballSeasonYear(competitionName?: string | null): number {
  if (isMlsLeague(competitionName)) return API_FOOTBALL_MLS_SEASON_YEAR;
  return isBrazilianLeague(competitionName)
    ? API_FOOTBALL_BRAZIL_SEASON_YEAR
    : API_FOOTBALL_EUROPEAN_SEASON_YEAR;
}

/** Resolves the ESPN standings season year from a DB competition name. */
export function resolveEspnSeasonYear(competitionName?: string | null): number {
  if (isWorldCupCompetition(competitionName)) return FIFA_WORLD_CUP_SEASON_YEAR;
  if (isMlsLeague(competitionName)) return ESPN_MLS_SEASON_YEAR;
  return isBrazilianLeague(competitionName)
    ? ESPN_BRAZIL_SEASON_YEAR
    : ESPN_EUROPEAN_SEASON_YEAR;
}
