/**
 * Date-based basketball season keys, so a new campaign is ingested without a code change.
 * PlayerSeasonStats / PlayerMatchStat store a campaign as a compact int: 2026-27 → 202627.
 */

/** 2026 → 202627. */
export function basketballSeasonKey(startYear: number): number {
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return Number(`${startYear}${endYY}`);
}

/** Start year of the campaign that begins in the calendar year `now` falls in, after `rolloverMonth` (0 = Jan). */
function seasonStartYear(now: Date, rolloverMonth: number): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= rolloverMonth ? year : year - 1;
}

/**
 * NBA / NBA Summer League. Rolls over on 1 July: summer league and offseason roster work
 * already belong to the upcoming campaign.
 */
export function resolveNbaBoxscoreSeason(now = new Date()): number {
  return basketballSeasonKey(seasonStartYear(now, 6));
}

/**
 * ESPN season.type: 1 preseason, 2 regular season, 3 playoffs.
 * Preseason must not inflate the campaign totals. When the type is missing,
 * games before 20 October of the campaign start year are treated as preseason.
 */
export function nbaGameCountsTowardSeason(
  matchDate: Date,
  seasonType?: number | null
): boolean {
  if (seasonType === 1) return false;
  if (seasonType === 2 || seasonType === 3) return true;
  const startYear = seasonStartYear(matchDate, 6);
  const regularSeasonStart = Date.UTC(startYear, 9, 20);
  return matchDate.getTime() >= regularSeasonStart;
}

export type NbaPhaseLabel = "Preseason" | "Regular season" | "Playoffs";

/**
 * Visible phase for a tip-off. Games before 20 October of the campaign start
 * year are preseason even when a feed omits season type. ESPN type 1 is
 * preseason, type 3 is playoffs.
 */
export function nbaPhaseLabel(matchDate: Date, seasonType?: number | null): NbaPhaseLabel {
  const startYear = seasonStartYear(matchDate, 6);
  const regularSeasonStart = Date.UTC(startYear, 9, 20);
  if (seasonType === 1 || matchDate.getTime() < regularSeasonStart) return "Preseason";
  if (seasonType === 3) return "Playoffs";
  return "Regular season";
}

/** ESPN sends season.type as a number or as `{ type: 1 }`. */
export function readEspnSeasonType(
  season?: { type?: number | { type?: number | string } } | null
): number | null {
  const type = season?.type;
  if (typeof type === "number" && Number.isFinite(type)) return type;
  if (type && typeof type === "object") {
    const nested = type.type;
    if (typeof nested === "number" && Number.isFinite(nested)) return nested;
    if (typeof nested === "string" && /^\d+$/.test(nested)) return Number(nested);
  }
  return null;
}

/** Season totals grow only for a new appearance that belongs in the campaign. */
export function shouldApplyBoxScoreToSeason(
  appearanceCreated: boolean,
  countsTowardSeason: boolean
): boolean {
  return appearanceCreated && countsTowardSeason;
}

/** NCAA men's basketball. Rolls over on 1 November, when games actually start. */
export function resolveNcaaBoxscoreSeason(now = new Date()): number {
  return basketballSeasonKey(seasonStartYear(now, 10));
}

/**
 * EuroLeague API season code (E2026) and persisted key (202627).
 * Rolls over on 1 July: clubs and rosters are published over the summer, games start in late September.
 */
export function resolveEuroLeagueSeason(now = new Date()): { code: string; year: number } {
  const startYear = seasonStartYear(now, 6);
  return { code: `E${startYear}`, year: basketballSeasonKey(startYear) };
}
