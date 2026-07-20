import { readFile } from "fs/promises";
import path from "path";
import type { StatsBombMatch } from "@/lib/statsbomb/types";
import {
  fetchWorldCup2026LiveEvents,
  mergeWorldCupLiveScores,
  persistEspnMatches,
  syncWorldCup2026Matches,
  type EspnScoreboardEvent,
} from "@/lib/api/espn-matches";
import { getPrisma } from "@/lib/prisma";
import {
  FIFA_WORLD_CUP_LABEL,
  FIFA_WORLD_CUP_SEASON_LABEL,
  FIFA_WORLD_CUP_SLUG,
} from "@/lib/seasons";
import { canUseDatabase, readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";

const WC2026_JSON = path.join(process.cwd(), "src/data/mock/world-cup-2026.json");
const WC_SYNC_CACHE_KEY = "wc2026:fixtures:last-sync";
/** Full 2026 tournament is 104 fixtures — below this we treat the DB as incomplete. */
export const WC_MIN_DB_FIXTURES = 80;

async function readWorldCupJson(): Promise<StatsBombMatch[]> {
  const raw = await readFile(WC2026_JSON, "utf8");
  return JSON.parse(raw) as StatsBombMatch[];
}

export async function countWorldCupDbFixtures(): Promise<number> {
  if (!canUseDatabase()) return 0;

  const prisma = getPrisma();
  return prisma.match.count({
    where: {
      source: "espn",
      externalKey: { startsWith: `espn:${FIFA_WORLD_CUP_SLUG}:` },
      seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
    },
  });
}

function mapJsonMatchToEspnEvent(match: StatsBombMatch): EspnScoreboardEvent | null {
  const espnEventId = match.metadata?.espn_event_id;
  if (espnEventId == null || String(espnEventId).length === 0) return null;

  const group =
    match.home_team.home_team_group ?? match.away_team.away_team_group ?? null;
  const stageName = match.competition_stage?.name ?? "Matchday";
  const round =
    group && stageName.toLowerCase().includes("group")
      ? `Group ${group}`
      : stageName;

  const statusRaw = (match.match_status ?? "").toLowerCase();
  const status =
    statusRaw === "live" || statusRaw === "in"
      ? "live"
      : statusRaw === "available" ||
          statusRaw === "played" ||
          statusRaw === "finished"
        ? "finished"
        : "scheduled";

  return {
    externalKey: `espn:${FIFA_WORLD_CUP_SLUG}:${espnEventId}`,
    homeTeamName: match.home_team.home_team_name,
    awayTeamName: match.away_team.away_team_name,
    homeScore: match.home_score ?? 0,
    awayScore: match.away_score ?? 0,
    matchDate: new Date(`${match.match_date}T${match.kick_off || "12:00:00"}Z`),
    round,
    status,
    seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
    espnSlug: FIFA_WORLD_CUP_SLUG,
    competitionLabel: FIFA_WORLD_CUP_LABEL,
  };
}

/** Upsert the finished-tournament JSON into Match so the hub can read from DB. */
export async function seedWorldCupDbFromJson(): Promise<number> {
  if (!canUseDatabase()) return 0;

  const cached = await readWorldCupJson();
  const events = cached
    .map(mapJsonMatchToEspnEvent)
    .filter((event): event is EspnScoreboardEvent => event != null);

  return persistEspnMatches(events);
}

/**
 * Warm the DB without blocking SSR:
 * 1) seed from local JSON if the table is thin (tournament already complete)
 * 2) optional ESPN refresh behind TTL (cron also runs this)
 */
function kickOffWorldCupDbWarmup(): void {
  if (!canUseDatabase()) return;

  void (async () => {
    try {
      const count = await countWorldCupDbFixtures();
      if (count < WC_MIN_DB_FIXTURES) {
        const seeded = await seedWorldCupDbFromJson();
        console.info(`[world-cup-2026] Seeded ${seeded} fixtures from JSON → DB`);
      }

      const last = await readSystemCache<{ fetchedAt?: string }>(WC_SYNC_CACHE_KEY);
      const fetchedAt = last?.fetchedAt ? new Date(last.fetchedAt) : null;
      if (!isStale(fetchedAt, MATCH_SYNC_TTL_MS)) return;

      const saved = await syncWorldCup2026Matches();
      await writeSystemCache(WC_SYNC_CACHE_KEY, {
        fetchedAt: new Date().toISOString(),
        saved,
      });
    } catch (error) {
      console.warn("[world-cup-2026] DB warmup skipped:", error);
    }
  })();
}

/**
 * Hub / historical load: local JSON structure (groups) + background DB warmup.
 * Prefer `loadWorldCupHub` which serves Match rows when the DB is warm.
 */
export async function loadWorldCup2026Matches(): Promise<StatsBombMatch[]> {
  kickOffWorldCupDbWarmup();
  return readWorldCupJson();
}

/** Optional live merge for cron / scripts — not used on the hub request path. */
export async function loadWorldCup2026MatchesWithLiveScores(): Promise<StatsBombMatch[]> {
  const cached = await loadWorldCup2026Matches();
  try {
    const live = await fetchWorldCup2026LiveEvents();
    return mergeWorldCupLiveScores(cached, live);
  } catch (error) {
    console.warn("[world-cup-2026] Live ESPN merge failed — using cached JSON:", error);
    return cached;
  }
}
