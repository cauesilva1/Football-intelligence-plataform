import {
  BRAZIL_SEASON_LABEL,
  CURRENT_SEASON,
  isBrazilianLeague,
  resolveApiFootballSeasonYear,
} from "@/lib/seasons";

/** Shared staleness rules for external API → Supabase sync. */
export const SYNC_TTL_MS = 24 * 60 * 60 * 1000;
export const MATCH_SYNC_TTL_MS = 6 * 60 * 60 * 1000;

export function isStale(syncedAt: Date | null | undefined, ttlMs = SYNC_TTL_MS): boolean {
  if (!syncedAt) return true;
  return Date.now() - syncedAt.getTime() > ttlMs;
}

/** Extracts the starting calendar year from labels like "2025/26" or "2026". */
export function parseSeasonStartYear(seasonLabel?: string | null): number | null {
  if (!seasonLabel?.trim()) return null;
  const crossYear = seasonLabel.match(/^(\d{4})\/\d{2}$/);
  if (crossYear) return Number(crossYear[1]);
  const calendarYear = seasonLabel.match(/^(\d{4})$/);
  if (calendarYear) return Number(calendarYear[1]);
  return null;
}

/**
 * Validates cached data against the active campaign:
 * Europe ≥ 2025 (25/26), Brasileirão 2026 ao vivo.
 */
export function isSeasonCurrentForCompetition(
  seasonLabel: string | null | undefined,
  competitionName?: string | null
): boolean {
  if (!seasonLabel?.trim()) return false;
  if (isBrazilianLeague(competitionName)) {
    return seasonLabel === BRAZIL_SEASON_LABEL;
  }
  if (seasonLabel === CURRENT_SEASON) return true;

  const minYear = resolveApiFootballSeasonYear(competitionName);
  const storedYear = parseSeasonStartYear(seasonLabel);
  return storedYear != null && storedYear >= minYear;
}

export function needsPlayerSync(player: {
  photoUrl?: string | null;
  marketValue: number;
  dataSyncedAt?: Date | null;
  dataSyncedSeason?: string | null;
  competitionName?: string | null;
  currentSeasonLabel?: string | null;
  hasMeaningfulStats?: boolean;
}): boolean {
  const seasonLabel = player.dataSyncedSeason ?? player.currentSeasonLabel;
  if (!isSeasonCurrentForCompetition(seasonLabel, player.competitionName)) return true;
  if (player.hasMeaningfulStats === false) return true;
  if (!player.photoUrl?.trim() || player.marketValue <= 0) return true;
  return isStale(player.dataSyncedAt);
}

export function needsTeamSync(team: {
  crestUrl?: string | null;
  stadium?: string | null;
  dataSyncedAt?: Date | null;
  dataSyncedSeason?: string | null;
  competitionName?: string | null;
  currentSeasonLabel?: string | null;
}): boolean {
  const seasonLabel = team.dataSyncedSeason ?? team.currentSeasonLabel;
  if (!isSeasonCurrentForCompetition(seasonLabel, team.competitionName)) return true;
  if (!team.crestUrl?.trim() || !team.stadium?.trim()) return true;
  return isStale(team.dataSyncedAt);
}

export function needsMatchSync(
  latestSeasonLabel: string | null | undefined,
  competitionName?: string | null,
  syncedAt?: Date | null,
  hasStaleScheduled = false
): boolean {
  if (!isSeasonCurrentForCompetition(latestSeasonLabel, competitionName)) return true;
  if (hasStaleScheduled) return true;
  return isStale(syncedAt, MATCH_SYNC_TTL_MS);
}

export function matchNeedsScoreRefresh(match: {
  status: string;
  matchDate: Date;
  homeScore: number;
  awayScore: number;
}): boolean {
  const kickoffPassed = match.matchDate.getTime() < Date.now() - 2 * 60 * 60 * 1000;
  const notFinished = match.status !== "finished";
  const frozenScoreline = match.homeScore === 0 && match.awayScore === 0;
  return kickoffPassed && (notFinished || frozenScoreline);
}

export function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeNameForMatch(a);
  const nb = normalizeNameForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const aLast = na.split(" ").pop();
  const bLast = nb.split(" ").pop();
  return Boolean(aLast && bLast && aLast.length > 2 && aLast === bLast);
}
