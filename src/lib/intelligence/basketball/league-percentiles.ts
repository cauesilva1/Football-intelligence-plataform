import type { Sport } from "@/lib/sport";
import {
  cohortEligibleForBasketballPercentiles,
  extractBasketballDimensionRawScores,
} from "@/lib/intelligence/basketball/basketball-dimension-raw-scores";
import {
  BASKETBALL_DIMENSION_KEYS,
  type BasketballDimensionKey,
} from "@/lib/intelligence/basketball/types";
import { percentileRank } from "@/lib/intelligence/soccer/league-percentiles";
import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import type { Player } from "@/types";

const MIN_COHORT_SIZE = 8;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface BasketballLeaguePositionPercentileTable {
  sport: Extract<Sport, "BASKETBALL">;
  league: string;
  position: string;
  season: string;
  cohortSize: number;
  distributions: Record<BasketballDimensionKey, number[]>;
  builtAt: string;
}

type CachedPercentilePayload = BasketballLeaguePositionPercentileTable & { expiresAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __fipBbPercentileMemoryCache: Map<string, CachedPercentilePayload> | undefined;
}

const memoryCache =
  globalThis.__fipBbPercentileMemoryCache ?? new Map<string, CachedPercentilePayload>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__fipBbPercentileMemoryCache = memoryCache;
}

function cacheKey(sport: Sport, league: string, position: string, season: string): string {
  return `intel-percentiles:${sport}:${league}:${position}:${season}`;
}

/** Build league+position percentile distributions — never mix NBA/NCAA/EuroLeague. */
export function buildBasketballLeaguePositionPercentileTable(
  cohort: Player[],
  options: { sport: "BASKETBALL"; league: string; position: string; season: string }
): BasketballLeaguePositionPercentileTable | null {
  const leagueKey = options.league.trim().toLowerCase();
  const sameLeague = cohort.filter(
    (player) =>
      (player.sport ?? "BASKETBALL") === "BASKETBALL" &&
      (player.league ?? "").trim().toLowerCase() === leagueKey
  );
  const eligible = sameLeague.filter(cohortEligibleForBasketballPercentiles);
  if (eligible.length < MIN_COHORT_SIZE) return null;

  const distributions = Object.fromEntries(
    BASKETBALL_DIMENSION_KEYS.map((key) => [key, [] as number[]])
  ) as Record<BasketballDimensionKey, number[]>;

  for (const player of eligible) {
    const raw = extractBasketballDimensionRawScores(player);
    for (const key of BASKETBALL_DIMENSION_KEYS) {
      distributions[key].push(raw[key]);
    }
  }

  for (const key of BASKETBALL_DIMENSION_KEYS) {
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

export function lookupBasketballPercentileScores(
  player: Player,
  table: BasketballLeaguePositionPercentileTable
): Record<BasketballDimensionKey, number> | null {
  if (!cohortEligibleForBasketballPercentiles(player)) return null;
  if ((player.league ?? "").trim().toLowerCase() !== table.league.trim().toLowerCase()) {
    return null;
  }

  const raw = extractBasketballDimensionRawScores(player);
  return Object.fromEntries(
    BASKETBALL_DIMENSION_KEYS.map((key) => [
      key,
      percentileRank(raw[key], table.distributions[key]),
    ])
  ) as Record<BasketballDimensionKey, number>;
}

export async function computeBasketballLeaguePositionPercentiles(
  sport: "BASKETBALL",
  league: string,
  position: string,
  options: { season: string; cohort: Player[] }
): Promise<BasketballLeaguePositionPercentileTable | null> {
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

  const table = buildBasketballLeaguePositionPercentileTable(options.cohort, {
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
