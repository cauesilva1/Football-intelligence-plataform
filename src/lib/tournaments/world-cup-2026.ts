import { readFile } from "fs/promises";
import path from "path";
import type { StatsBombMatch } from "@/lib/statsbomb/types";
import {
  fetchEspnScoreboard,
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
  FIFA_WORLD_CUP_SEASON_YEAR,
  FIFA_WORLD_CUP_SLUG,
} from "@/lib/seasons";
import { canUseDatabase, readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";

const WC2026_JSON = path.join(process.cwd(), "src/data/mock/world-cup-2026.json");
const WC_SYNC_CACHE_KEY = "wc2026:fixtures:last-sync";
/** Bump when team-resolution / seed semantics change — forces JSON → DB rewrite. */
const WC_SEED_VERSION_KEY = "wc2026:fixtures:seed-version";
export const WC_SEED_VERSION = "v2-national-teams";
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

/**
 * Matches whose home/away teams belong to the World Cup competition
 * (national sides created for fifa.world — not club rows linked by country).
 */
export async function countHealthyWorldCupDbFixtures(): Promise<number> {
  if (!canUseDatabase()) return 0;

  const prisma = getPrisma();
  const competition = await prisma.competition.findFirst({
    where: { espnSlug: FIFA_WORLD_CUP_SLUG },
    select: { id: true },
  });
  if (!competition) return 0;

  return prisma.match.count({
    where: {
      competitionId: competition.id,
      seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
      externalKey: { startsWith: `espn:${FIFA_WORLD_CUP_SLUG}:` },
      homeTeam: { competitionId: competition.id },
      awayTeam: { competitionId: competition.id },
    },
  });
}

export async function isWorldCupDbReady(): Promise<boolean> {
  if (!canUseDatabase()) return false;
  const [healthy, seedMeta] = await Promise.all([
    countHealthyWorldCupDbFixtures(),
    readSystemCache<{ version?: string }>(WC_SEED_VERSION_KEY),
  ]);
  return healthy >= WC_MIN_DB_FIXTURES && seedMeta?.version === WC_SEED_VERSION;
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

/** Upsert curated JSON into Match with correct national-team FKs. */
export async function seedWorldCupDbFromJson(): Promise<number> {
  if (!canUseDatabase()) return 0;

  const cached = await readWorldCupJson();
  const events = cached
    .map(mapJsonMatchToEspnEvent)
    .filter((event): event is EspnScoreboardEvent => event != null);

  const saved = await persistEspnMatches(events);
  await writeSystemCache(WC_SEED_VERSION_KEY, {
    version: WC_SEED_VERSION,
    seededAt: new Date().toISOString(),
    saved,
  });
  return saved;
}

/**
 * Warm the DB without blocking SSR:
 * 1) force JSON seed when incomplete / outdated seed version (rewrites club FKs)
 * 2) optional ESPN refresh behind TTL (tournament complete — light touch)
 */
function kickOffWorldCupDbWarmup(): void {
  if (!canUseDatabase()) return;

  void (async () => {
    try {
      const [healthy, seedMeta, last] = await Promise.all([
        countHealthyWorldCupDbFixtures(),
        readSystemCache<{ version?: string }>(WC_SEED_VERSION_KEY),
        readSystemCache<{ fetchedAt?: string }>(WC_SYNC_CACHE_KEY),
      ]);

      const needsSeed =
        healthy < WC_MIN_DB_FIXTURES || seedMeta?.version !== WC_SEED_VERSION;

      if (needsSeed) {
        const seeded = await seedWorldCupDbFromJson();
        console.info(
          `[world-cup-2026] Seeded ${seeded} fixtures from JSON → DB (${WC_SEED_VERSION})`
        );
      }

      const fetchedAt = last?.fetchedAt ? new Date(last.fetchedAt) : null;
      if (!isStale(fetchedAt, MATCH_SYNC_TTL_MS)) return;

      // Tournament complete — prefer JSON seed over aggressive live scoreboard fan-out.
      // Still allow a light ESPN sync so late corrections land in DB.
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

/** Pull ESPN scoreboards only for still-open fixture dates. */
async function mergePendingEspnScores(cached: StatsBombMatch[]): Promise<StatsBombMatch[]> {
  const pendingDates = [
    ...new Set(
      cached
        .filter((match) => {
          const status = (match.match_status ?? "").toLowerCase();
          return status === "scheduled" || status === "live" || status === "in";
        })
        .map((match) => match.match_date)
    ),
  ].slice(0, 3);

  if (!pendingDates.length) return cached;

  try {
    const batches = await Promise.all(
      pendingDates.map((dateStr) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        return fetchEspnScoreboard(FIFA_WORLD_CUP_SLUG, FIFA_WORLD_CUP_LABEL, {
          date: new Date(Date.UTC(year, month - 1, day)),
          seasonYear: FIFA_WORLD_CUP_SEASON_YEAR,
          seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
        });
      })
    );
    return mergeWorldCupLiveScores(cached, batches.flat());
  } catch (error) {
    console.warn("[world-cup-2026] Pending ESPN merge skipped:", error);
    return cached;
  }
}

/**
 * JSON fixtures for standings / historical structure + background DB warmup.
 * Hub prefers healthy DB rows for the Games tab when available.
 */
export async function loadWorldCup2026Matches(): Promise<StatsBombMatch[]> {
  kickOffWorldCupDbWarmup();
  const cached = await readWorldCupJson();
  return mergePendingEspnScores(cached);
}

/** Optional full live merge for cron / scripts. */
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
