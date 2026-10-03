/** Completed European showcase season (kept in history / filters). */
export const CURRENT_SEASON = "2025/26";

/** Live European cross-year season after August kickoff. */
export const NEXT_EUROPEAN_SEASON = "2026/27";

/** When true, UI + ESPN persist NEXT_EUROPEAN_SEASON as the live European label. */
export const EUROPEAN_NEXT_SEASON_LIVE = true;

/** Label used for live European standings, fixtures, and newly persisted stats. */
export const LIVE_EUROPEAN_SEASON = EUROPEAN_NEXT_SEASON_LIVE
  ? NEXT_EUROPEAN_SEASON
  : CURRENT_SEASON;

/** Seasons with real showcase data — do not include NEXT until EUROPEAN_NEXT_SEASON_LIVE. */
export const SHOWCASE_SEASONS = ["2023/24", "2024/25", CURRENT_SEASON] as const;

/** All season labels the UI may list (includes NEXT when live). */
export type SeasonLabel = (typeof SHOWCASE_SEASONS)[number] | typeof NEXT_EUROPEAN_SEASON;

export const SEASONS: readonly SeasonLabel[] = EUROPEAN_NEXT_SEASON_LIVE
  ? [...SHOWCASE_SEASONS, NEXT_EUROPEAN_SEASON]
  : [...SHOWCASE_SEASONS];

/** API-Football `season` param for European cross-year leagues (2026/27 → 2026). */
export const API_FOOTBALL_EUROPEAN_SEASON_YEAR = 2026;

/** API-Football `season` param for calendar-year leagues (Brasileirão / MLS 2026). */
export const API_FOOTBALL_BRAZIL_SEASON_YEAR = 2026;
export const API_FOOTBALL_MLS_SEASON_YEAR = 2026;

/** ESPN standings `season` for European leagues (2026/27 → 2026). */
export const ESPN_EUROPEAN_SEASON_YEAR = 2026;

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

/** Copas / CONMEBOL em andamento no calendário 2026 (ESPN). */
export const ESPN_COPA_DO_BRASIL_SLUG = "bra.copa_do_brazil";
export const ESPN_LIBERTADORES_SLUG = "conmebol.libertadores";
export const ESPN_SUDAMERICANA_SLUG = "conmebol.sudamericana";
export const ESPN_CONMEBOL_SEASON_YEAR = 2026;
export const COPA_DO_BRASIL_LABEL = "Copa do Brasil";
export const LIBERTADORES_LABEL = "CONMEBOL Libertadores";
export const SUDAMERICANA_LABEL = "CONMEBOL Sudamericana";

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

/** API-Football v3 league id. Stable across seasons. ESPN has no CPL slug. */
export const API_FOOTBALL_CPL_LEAGUE_ID = 479;
export const CPL_LABEL = "Canadian Premier League";

/** ESPN site API slug. Confirmed: 16 clubs. Not in the daily fixture list. */
export const ESPN_NWSL_SLUG = "usa.nwsl";
export const NWSL_LABEL = "NWSL";
/** ESPN labels the current NWSL campaign 2026–27. */
export const NWSL_SEASON_LABEL = "2026/27";

export function isCanadianPremierLeague(competitionName?: string | null): boolean {
  const n = competitionName?.toLowerCase() ?? "";
  return n.includes("canadian premier") || n === "cpl";
}

export function isNwslLeague(competitionName?: string | null): boolean {
  const n = competitionName?.toLowerCase() ?? "";
  return n.includes("nwsl") || n.includes("national women's soccer") || n.includes("usa.nwsl");
}

/**
 * Domestic calendars whose rosters live on Player / PlayerSeasonStats
 * (ESPN or API-Football squads), not on European PlayerStatistic "2025/26" rows.
 */
export function isCalendarRosterCompetition(competitionName?: string | null): boolean {
  return (
    isMlsLeague(competitionName) ||
    isBrazilianLeague(competitionName) ||
    isCanadianPremierLeague(competitionName) ||
    isNwslLeague(competitionName)
  );
}

export function isCopaDoBrasil(competitionName?: string | null): boolean {
  const n = competitionName?.toLowerCase() ?? "";
  return n.includes("copa do brasil") || n.includes("bra.copa_do_brazil");
}

export function isLibertadores(competitionName?: string | null): boolean {
  const n = competitionName?.toLowerCase() ?? "";
  return n.includes("libertadores") || n.includes("conmebol.libertadores");
}

export function isSudamericana(competitionName?: string | null): boolean {
  const n = competitionName?.toLowerCase() ?? "";
  return n.includes("sudamericana") || n.includes("conmebol.sudamericana");
}

/** Calendar-year domestic leagues (not European cross-year). */
export function isCalendarYearLeague(competitionName?: string | null): boolean {
  return (
    isBrazilianLeague(competitionName) ||
    isMlsLeague(competitionName) ||
    isCopaDoBrasil(competitionName) ||
    isLibertadores(competitionName) ||
    isSudamericana(competitionName)
  );
}

/** Season label used when persisting TeamStatistic / Match for a competition. */
export function resolvePersistedSeasonLabel(competitionName?: string | null): string {
  if (isWorldCupCompetition(competitionName)) return FIFA_WORLD_CUP_SEASON_LABEL;
  if (isNwslLeague(competitionName)) return NWSL_SEASON_LABEL;
  if (isMlsLeague(competitionName)) return MLS_SEASON_LABEL;
  if (
    isBrazilianLeague(competitionName) ||
    isCopaDoBrasil(competitionName) ||
    isLibertadores(competitionName) ||
    isSudamericana(competitionName)
  ) {
    return BRAZIL_SEASON_LABEL;
  }
  return LIVE_EUROPEAN_SEASON;
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
  if (
    isBrazilianLeague(competitionName) ||
    isCopaDoBrasil(competitionName) ||
    isLibertadores(competitionName) ||
    isSudamericana(competitionName)
  ) {
    return ESPN_BRAZIL_SEASON_YEAR;
  }
  return ESPN_EUROPEAN_SEASON_YEAR;
}
