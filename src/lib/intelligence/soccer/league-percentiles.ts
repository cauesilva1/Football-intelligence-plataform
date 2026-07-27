import type { Sport } from "@/lib/sport";
import {
  cohortEligibleForPercentiles,
  extractSoccerDimensionRawScores,
} from "@/lib/intelligence/soccer/soccer-dimension-raw-scores";
import type { SoccerDimensionKey } from "@/lib/intelligence/soccer/types";
import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import type { Player } from "@/types";

const SOCCER_DIMENSION_KEYS: SoccerDimensionKey[] = [
  "production",
  "creation",
  "defense",
  "ball_progression",
];

const MIN_COHORT_SIZE = 8;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface LeaguePositionPercentileTable {
  sport: Extract<Sport, "SOCCER">;
  league: string;
  position: string;
  season: string;
  cohortSize: number;
  distributions: Record<SoccerDimensionKey, number[]>;
  builtAt: string;
}

type CachedPercentilePayload = LeaguePositionPercentileTable & { expiresAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __fipPercentileMemoryCache: Map<string, CachedPercentilePayload> | undefined;
}

const memoryCache =
  globalThis.__fipPercentileMemoryCache ?? new Map<string, CachedPercentilePayload>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__fipPercentileMemoryCache = memoryCache;
}

function cacheKey(sport: Sport, league: string, position: string, season: string): string {
  return `intel-percentiles:${sport}:${league}:${position}:${season}`;
}

/** Percentile rank 0–100 using inclusive rank among sorted values. */
export function percentileRank(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return 50;

  let below = 0;
  let equal = 0;
  for (const sample of sortedValues) {
    if (sample < value) below += 1;
    else if (sample === value) equal += 1;
  }

  return Math.round(((below + equal * 0.5) / sortedValues.length) * 100);
}

/** Build league+position percentile distributions from a cohort of players. */
export function buildLeaguePositionPercentileTable(
  cohort: Player[],
  options: { sport: "SOCCER"; league: string; position: string; season: string }
): LeaguePositionPercentileTable | null {
  const eligible = cohort.filter(cohortEligibleForPercentiles);
  if (eligible.length < MIN_COHORT_SIZE) return null;

  const distributions = Object.fromEntries(
    SOCCER_DIMENSION_KEYS.map((key) => [key, [] as number[]])
  ) as Record<SoccerDimensionKey, number[]>;

  for (const player of eligible) {
    const raw = extractSoccerDimensionRawScores(player);
    for (const key of SOCCER_DIMENSION_KEYS) {
      distributions[key].push(raw[key]);
    }
  }

  for (const key of SOCCER_DIMENSION_KEYS) {
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

export function lookupPlayerPercentileScores(
  player: Player,
  table: LeaguePositionPercentileTable
): Record<SoccerDimensionKey, number> | null {
  if (!cohortEligibleForPercentiles(player)) return null;

  const raw = extractSoccerDimensionRawScores(player);
  return Object.fromEntries(
    SOCCER_DIMENSION_KEYS.map((key) => [
      key,
      percentileRank(raw[key], table.distributions[key]),
    ])
  ) as Record<SoccerDimensionKey, number>;
}

async function readCachedTable(key: string): Promise<LeaguePositionPercentileTable | null> {
  const inMemory = memoryCache.get(key);
  if (inMemory && inMemory.expiresAt > Date.now()) {
    const { expiresAt: _expiresAt, ...table } = inMemory;
    return table;
  }

  const persisted = await readSystemCache<CachedPercentilePayload>(key);
  if (!persisted || persisted.expiresAt <= Date.now()) return null;

  memoryCache.set(key, persisted);
  const { expiresAt: _expiresAt, ...table } = persisted;
  return table;
}

async function writeCachedTable(key: string, table: LeaguePositionPercentileTable): Promise<void> {
  const payload: CachedPercentilePayload = {
    ...table,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  memoryCache.set(key, payload);
  await writeSystemCache(key, payload as object);
}

/**
 * League-relative percentile table for a position cohort.
 * Uses in-memory cache first, then SystemCache (6h TTL).
 */
export async function computeLeaguePositionPercentiles(
  sport: Sport,
  league: string,
  position: string,
  options: {
    season: string;
    cohort: Player[];
  }
): Promise<LeaguePositionPercentileTable | null> {
  if (sport !== "SOCCER") return null;

  const key = cacheKey(sport, league, position, options.season);
  const cached = await readCachedTable(key);
  if (cached) return cached;

  const table = buildLeaguePositionPercentileTable(options.cohort, {
    sport: "SOCCER",
    league,
    position,
    season: options.season,
  });
  if (!table) return null;

  await writeCachedTable(key, table);
  return table;
}

export function clearLeaguePercentileCacheForTests(): void {
  memoryCache.clear();
}
