/**
 * ESPN athlete season stats for NFL / College Football.
 * Endpoint: site.web.api.espn.com/.../athletes/{id}/stats
 */
import type { AmericanFootballLeagueCode } from "@/lib/american-football/team-league";

const ESPN_WEB = "https://site.web.api.espn.com/apis/common/v3/sports/football";

export interface ParsedFootballSeasonStats {
  matchesPlayed: number;
  passingYards: number;
  rushingYards: number;
  receivingYards: number;
  totalYards: number;
  touchdowns: number;
  receptions: number;
  completions: number;
  completionPct: number;
  tackles: number;
  sacks: number;
  interceptions: number;
}

interface EspnSeasonRef {
  year?: number;
  displayName?: string;
}

interface EspnStatRow {
  season?: EspnSeasonRef;
  stats?: string[];
}

interface EspnStatsCategory {
  name?: string;
  names?: string[];
  statistics?: EspnStatRow[];
}

interface EspnV3StatsResponse {
  categories?: EspnStatsCategory[];
}

function espnLeaguePath(league: AmericanFootballLeagueCode): string {
  return league === "NFL" ? "nfl" : "college-football";
}

function parseNumber(value?: string): number {
  if (!value?.trim()) return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function indexMap(names: string[]): Map<string, number> {
  const map = new Map<string, number>();
  names.forEach((name, i) => map.set(name, i));
  return map;
}

function readStat(values: string[], indexes: Map<string, number>, key: string): number {
  const idx = indexes.get(key);
  if (idx == null) return 0;
  return parseNumber(values[idx]);
}

function findSeasonRow(
  category: EspnStatsCategory | undefined,
  seasonYear: number
): EspnStatRow | null {
  const rows = category?.statistics ?? [];
  const exact = rows.find(
    (row) =>
      row.season?.year === seasonYear ||
      row.season?.displayName?.trim() === String(seasonYear)
  );
  return exact ?? null;
}

function emptyStats(): ParsedFootballSeasonStats {
  return {
    matchesPlayed: 0,
    passingYards: 0,
    rushingYards: 0,
    receivingYards: 0,
    totalYards: 0,
    touchdowns: 0,
    receptions: 0,
    completions: 0,
    completionPct: 0,
    tackles: 0,
    sacks: 0,
    interceptions: 0,
  };
}

/**
 * Parse ESPN category bags for a target season year (e.g. 2025).
 */
export function parseFootballSeasonFromCategories(
  categories: EspnStatsCategory[] | null | undefined,
  seasonYear: number
): ParsedFootballSeasonStats | null {
  if (!categories?.length) return null;

  const byName = new Map(categories.map((c) => [c.name ?? "", c]));
  const passing = byName.get("passing");
  const rushing = byName.get("rushing");
  const receiving = byName.get("receiving");
  const defensive = byName.get("defensive");
  const scoring = byName.get("scoring");

  const passRow = findSeasonRow(passing, seasonYear);
  const rushRow = findSeasonRow(rushing, seasonYear);
  const recvRow = findSeasonRow(receiving, seasonYear);
  const defRow = findSeasonRow(defensive, seasonYear);
  const scoreRow = findSeasonRow(scoring, seasonYear);

  if (!passRow && !rushRow && !recvRow && !defRow && !scoreRow) return null;

  const passIdx = indexMap(passing?.names ?? []);
  const rushIdx = indexMap(rushing?.names ?? []);
  const recvIdx = indexMap(receiving?.names ?? []);
  const defIdx = indexMap(defensive?.names ?? []);
  const scoreIdx = indexMap(scoring?.names ?? []);

  const passVals = passRow?.stats ?? [];
  const rushVals = rushRow?.stats ?? [];
  const recvVals = recvRow?.stats ?? [];
  const defVals = defRow?.stats ?? [];
  const scoreVals = scoreRow?.stats ?? [];

  const matchesPlayed = Math.max(
    readStat(passVals, passIdx, "gamesPlayed"),
    readStat(rushVals, rushIdx, "gamesPlayed"),
    readStat(recvVals, recvIdx, "gamesPlayed"),
    readStat(defVals, defIdx, "gamesPlayed"),
    readStat(scoreVals, scoreIdx, "gamesPlayed")
  );

  const passingYards = readStat(passVals, passIdx, "passingYards");
  const rushingYards = readStat(rushVals, rushIdx, "rushingYards");
  const receivingYards = Math.max(0, readStat(recvVals, recvIdx, "receivingYards"));
  const scoredTds =
    readStat(passVals, passIdx, "passingTouchdowns") +
    readStat(rushVals, rushIdx, "rushingTouchdowns") +
    readStat(recvVals, recvIdx, "receivingTouchdowns") +
    readStat(scoreVals, scoreIdx, "returnTouchdowns");
  const listedTotal = readStat(scoreVals, scoreIdx, "totalTouchdowns");
  const touchdowns = Math.max(scoredTds, listedTotal);
  const result: ParsedFootballSeasonStats = {
    matchesPlayed,
    passingYards,
    rushingYards,
    receivingYards,
    totalYards: passingYards + rushingYards + receivingYards,
    touchdowns,
    receptions: readStat(recvVals, recvIdx, "receptions"),
    completions: readStat(passVals, passIdx, "completions"),
    completionPct: readStat(passVals, passIdx, "completionPct"),
    tackles: readStat(defVals, defIdx, "totalTackles"),
    sacks: readStat(defVals, defIdx, "sacks"),
    interceptions: readStat(defVals, defIdx, "interceptions"),
  };

  const hasSignal =
    result.matchesPlayed > 0 ||
    result.totalYards > 0 ||
    result.touchdowns > 0 ||
    result.tackles > 0 ||
    result.sacks > 0;

  return hasSignal ? result : emptyStats();
}

export async function fetchFootballAthleteSeasonStats(options: {
  espnAthleteId: number | string;
  league: AmericanFootballLeagueCode;
  seasonYear: number;
  /** Profile path should stay snappy — default 12s. */
  timeoutMs?: number;
}): Promise<ParsedFootballSeasonStats | null> {
  const url = `${ESPN_WEB}/${espnLeaguePath(options.league)}/athletes/${options.espnAthleteId}/stats`;
  const timeoutMs = options.timeoutMs ?? 12_000;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (af-athlete-stats)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as EspnV3StatsResponse;
    return parseFootballSeasonFromCategories(payload.categories, options.seasonYear);
  } catch {
    return null;
  }
}

/**
 * Encode AF season production into the shared PlayerSeasonStats columns.
 * Decode in map-season-stats.ts.
 */
export function encodeFootballStatsForPrisma(stats: ParsedFootballSeasonStats) {
  return {
    matchesPlayed: Math.round(stats.matchesPlayed),
    minutesPlayed: Math.round(stats.matchesPlayed * 60),
    goals: Math.round(stats.touchdowns),
    assists: Math.round(stats.receptions || stats.completions),
    points: Math.round(stats.totalYards),
    rebounds: Math.round(stats.rushingYards),
    blocks: Math.round(stats.receivingYards),
    // steals stores sacks * 10 so half-sacks survive as Int
    steals: Math.round(stats.sacks * 10),
    // threePointsPercent stores passing yards (Float)
    threePointsPercent: stats.passingYards,
    fieldGoalsPercent: 0,
    tackles: stats.tackles,
    interceptions: stats.interceptions,
    passingAccuracy: stats.completionPct,
  };
}

export function zeroFootballStatsForPrisma() {
  return encodeFootballStatsForPrisma(emptyStats());
}
