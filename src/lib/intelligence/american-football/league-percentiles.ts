import type { Sport } from "@/lib/sport";
import {
  cohortEligibleForAmericanFootballPercentiles,
  extractAmericanFootballDimensionRawScores,
} from "@/lib/intelligence/american-football/american-football-dimension-raw-scores";
import {
  AMERICAN_FOOTBALL_DIMENSION_KEYS,
  type AmericanFootballDimensionKey,
} from "@/lib/intelligence/american-football/types";
import { percentileRank } from "@/lib/intelligence/soccer/league-percentiles";
import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import type { Player } from "@/types";

const MIN_COHORT_SIZE = 8;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface AmericanFootballLeaguePositionPercentileTable {
  sport: Extract<Sport, "AMERICAN_FOOTBALL">;
  league: string;
  position: string;
  season: string;
  cohortSize: number;
  distributions: Record<AmericanFootballDimensionKey, number[]>;
  builtAt: string;
}

type CachedPercentilePayload = AmericanFootballLeaguePositionPercentileTable & {
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __fipAfPercentileMemoryCache: Map<string, CachedPercentilePayload> | undefined;
}

const memoryCache =
  globalThis.__fipAfPercentileMemoryCache ?? new Map<string, CachedPercentilePayload>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__fipAfPercentileMemoryCache = memoryCache;
}

function cacheKey(sport: Sport, league: string, position: string, season: string): string {
  return `intel-percentiles:${sport}:${league}:${position}:${season}`;
}

/** Build league+position percentile distributions — never mix NFL and CFB. */
export function buildAmericanFootballLeaguePositionPercentileTable(
  cohort: Player[],
  options: {
    sport: "AMERICAN_FOOTBALL";
    league: string;
    position: string;
    season: string;
  }
): AmericanFootballLeaguePositionPercentileTable | null {
  const leagueKey = options.league.trim().toLowerCase();
  const sameLeague = cohort.filter(
    (player) =>
      (player.sport ?? "AMERICAN_FOOTBALL") === "AMERICAN_FOOTBALL" &&
      (player.league ?? "").trim().toLowerCase() === leagueKey
  );
  const eligible = sameLeague.filter(cohortEligibleForAmericanFootballPercentiles);
  if (eligible.length < MIN_COHORT_SIZE) return null;

  const distributions = Object.fromEntries(
    AMERICAN_FOOTBALL_DIMENSION_KEYS.map((key) => [key, [] as number[]])
  ) as Record<AmericanFootballDimensionKey, number[]>;

  for (const player of eligible) {
    const raw = extractAmericanFootballDimensionRawScores(player);
    for (const key of AMERICAN_FOOTBALL_DIMENSION_KEYS) {
      distributions[key].push(raw[key]);
    }
  }

  for (const key of AMERICAN_FOOTBALL_DIMENSION_KEYS) {
    distributions[key].sort((a, b) => a - b);
  }

  return {
    sport: options.sport,
    league: options.league,
    position: options.position,
    season: options.season,
    cohortSize: eligible.length,
    distributions,
    builtAt: new Date().toISOString(),
  };
}

export function lookupAmericanFootballPercentileScores(
  player: Player,
  table: AmericanFootballLeaguePositionPercentileTable
): Record<AmericanFootballDimensionKey, number> | null {
  if (!cohortEligibleForAmericanFootballPercentiles(player)) return null;
  if ((player.league ?? "").trim().toLowerCase() !== table.league.trim().toLowerCase()) {
    return null;
  }

  const raw = extractAmericanFootballDimensionRawScores(player);
  return Object.fromEntries(
    AMERICAN_FOOTBALL_DIMENSION_KEYS.map((key) => [
      key,
      percentileRank(raw[key], table.distributions[key]),
    ])
  ) as Record<AmericanFootballDimensionKey, number>;
}

export async function computeAmericanFootballLeaguePositionPercentiles(
  sport: "AMERICAN_FOOTBALL",
  league: string,
  position: string,
  options: { season: string; cohort: Player[] }
): Promise<AmericanFootballLeaguePositionPercentileTable | null> {
  const key = cacheKey(sport, league, position, options.season);
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now) {
    const { expiresAt: _expiresAt, ...table } = mem;
    return table;
  }

  const cached = await readSystemCache<CachedPercentilePayload>(key);
  if (cached && cached.expiresAt > now) {
    memoryCache.set(key, cached);
    const { expiresAt: _expiresAt, ...table } = cached;
    return table;
  }

  const table = buildAmericanFootballLeaguePositionPercentileTable(options.cohort, {
    sport,
    league,
    position,
    season: options.season,
  });
  if (!table) return null;

  const payload: CachedPercentilePayload = { ...table, expiresAt: now + CACHE_TTL_MS };
  memoryCache.set(key, payload);
  await writeSystemCache(key, payload as object);
  return table;
}
