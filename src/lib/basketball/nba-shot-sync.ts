import { getPrisma } from "@/lib/prisma";
import { parseEspnBasketballShots } from "@/lib/basketball/espn-shot-parse";
import {
  NBA_SHOT_CHART_MAX_GAMES_PER_RUN,
  NBA_SHOT_CHART_MIN_GAME_MS,
  selectShotBackfillBatch,
} from "@/lib/basketball/shot-backfill-plan";

const SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";
const SHOT_CACHE_PREFIX = "espn:basketball:nba:shots:";

export class ShotCoordinatesUnavailableError extends Error {
  readonly eventId: string;

  constructor(eventId: string) {
    super(
      `ESPN summary for ${eventId} has no shot coordinate field; refusing to invent court locations`
    );
    this.name = "ShotCoordinatesUnavailableError";
    this.eventId = eventId;
  }
}

export interface IngestShotsResult {
  eventId: string;
  stored: number;
  skippedNoPlayer: number;
  skippedInvalidCoordinate: number;
  skippedFreeThrow: number;
}

export interface NbaShotBackfillResult {
  season: number;
  pendingAtStart: number;
  gamesProcessed: number;
  shotsStored: number;
  skippedNoPlayer: number;
  skippedInvalidCoordinate: number;
  failed: number;
  deferred: number;
  stoppedForTime: boolean;
  coordinatesUnavailable: boolean;
}

async function fetchNbaSummary(eventId: string): Promise<unknown> {
  const response = await fetch(`${SUMMARY_URL}?event=${eventId}`, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (nba-shot-chart)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`ESPN summary HTTP ${response.status} — event ${eventId}`);
  }
  return response.json();
}

/**
 * Persist field goals from an already-fetched ESPN summary.
 * Throws ShotCoordinatesUnavailableError when the payload has no coordinate field.
 */
export async function ingestNbaShotsFromSummary(input: {
  eventId: string;
  summary: unknown;
  season: number;
}): Promise<IngestShotsResult> {
  const parsed = parseEspnBasketballShots(input.summary);
  if (!parsed.coordinatesAvailable) {
    throw new ShotCoordinatesUnavailableError(input.eventId);
  }

  const prisma = getPrisma();
  const athleteIds = [...new Set(parsed.shots.map((shot) => Number.parseInt(shot.espnAthleteId, 10)))]
    .filter((id) => Number.isFinite(id));
  const players = athleteIds.length
    ? await prisma.player.findMany({
        where: { sport: "BASKETBALL", apiSportsId: { in: athleteIds } },
        select: { id: true, apiSportsId: true },
      })
    : [];
  const playerByEspnId = new Map<number, string>();
  for (const player of players) {
    if (player.apiSportsId != null && !playerByEspnId.has(player.apiSportsId)) {
      playerByEspnId.set(player.apiSportsId, player.id);
    }
  }

  const rows: Array<{
    playerId: string;
    gameId: string;
    externalPlayId: string;
    x: number;
    y: number;
    made: boolean;
    zone: string;
    shotType: string;
    season: number;
  }> = [];
  let skippedNoPlayer = 0;
  for (const shot of parsed.shots) {
    const playerId = playerByEspnId.get(Number.parseInt(shot.espnAthleteId, 10));
    if (!playerId) {
      skippedNoPlayer += 1;
      continue;
    }
    rows.push({
      playerId,
      gameId: input.eventId,
      externalPlayId: shot.externalPlayId,
      x: shot.x,
      y: shot.y,
      made: shot.made,
      zone: shot.zone,
      shotType: shot.shotType,
      season: input.season,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.basketballShot.deleteMany({ where: { gameId: input.eventId } });
    if (rows.length) {
      await tx.basketballShot.createMany({ data: rows });
    }
    await tx.systemCache.upsert({
      where: { key: `${SHOT_CACHE_PREFIX}${input.eventId}` },
      create: {
        key: `${SHOT_CACHE_PREFIX}${input.eventId}`,
        json: {
          eventId: input.eventId,
          season: input.season,
          stored: rows.length,
          skippedNoPlayer,
          processedAt: new Date().toISOString(),
        },
      },
      update: {
        json: {
          eventId: input.eventId,
          season: input.season,
          stored: rows.length,
          skippedNoPlayer,
          processedAt: new Date().toISOString(),
        },
      },
    });
  });

  return {
    eventId: input.eventId,
    stored: rows.length,
    skippedNoPlayer,
    skippedInvalidCoordinate: parsed.skippedInvalidCoordinate,
    skippedFreeThrow: parsed.skippedFreeThrow,
  };
}

export async function ingestNbaShotEvent(eventId: string, season: number): Promise<IngestShotsResult> {
  const summary = await fetchNbaSummary(eventId);
  return ingestNbaShotsFromSummary({ eventId, summary, season });
}

async function listPendingNbaEventIds(season: number): Promise<string[]> {
  const prisma = getPrisma();
  const [games, cached] = await Promise.all([
    prisma.$queryRaw<Array<{ externalEventKey: string }>>`
      SELECT "externalEventKey"
      FROM "player_match_stats"
      WHERE season = ${season} AND source = 'espn-nba' AND "externalEventKey" LIKE 'espn:nba:%'
      GROUP BY "externalEventKey"
      ORDER BY MIN("matchDate") ASC NULLS LAST
    `,
    prisma.systemCache.findMany({
      where: { key: { startsWith: SHOT_CACHE_PREFIX } },
      select: { key: true },
    }),
  ]);
  const done = new Set(cached.map((row) => row.key.slice(SHOT_CACHE_PREFIX.length)));
  const ids: string[] = [];
  for (const game of games) {
    const eventId = game.externalEventKey.slice("espn:nba:".length);
    if (!/^\d+$/.test(eventId) || done.has(eventId)) continue;
    ids.push(eventId);
  }
  return ids;
}

/**
 * Walk 2026-27 (or whichever campaign `season` is) games already in the DB.
 * Stops at the per-run cap and at the caller's deadline. Completed games are
 * skipped via systemCache, so the next run resumes where this one stopped.
 */
export async function backfillNbaShotCharts(options: {
  season: number;
  deadlineMs: number;
  maxGames?: number;
  minGameMs?: number;
  log?: (message: string) => void;
}): Promise<NbaShotBackfillResult> {
  const log = options.log ?? (() => {});
  const maxGames = options.maxGames ?? NBA_SHOT_CHART_MAX_GAMES_PER_RUN;
  const minGameMs = options.minGameMs ?? NBA_SHOT_CHART_MIN_GAME_MS;
  const pending = await listPendingNbaEventIds(options.season);
  const plan = selectShotBackfillBatch(pending, {
    maxGames,
    remainingMs: options.deadlineMs - Date.now(),
    minGameMs,
  });

  const result: NbaShotBackfillResult = {
    season: options.season,
    pendingAtStart: pending.length,
    gamesProcessed: 0,
    shotsStored: 0,
    skippedNoPlayer: 0,
    skippedInvalidCoordinate: 0,
    failed: 0,
    deferred: pending.length,
    stoppedForTime: plan.stoppedForTime,
    coordinatesUnavailable: false,
  };

  if (!plan.batch.length) {
    log(
      plan.stoppedForTime
        ? `adiado — ${pending.length} jogo(s) pendente(s), sem orçamento para mais um summary`
        : `nada pendente na temporada ${options.season}`
    );
    return result;
  }

  log(`fila ${pending.length} · nesta rodada até ${plan.batch.length} (teto ${maxGames})`);

  for (const eventId of plan.batch) {
    if (Date.now() + minGameMs > options.deadlineMs) {
      result.stoppedForTime = true;
      log(`parada por tempo antes do evento ${eventId}`);
      break;
    }

    try {
      const ingested = await ingestNbaShotEvent(eventId, options.season);
      result.gamesProcessed += 1;
      result.shotsStored += ingested.stored;
      result.skippedNoPlayer += ingested.skippedNoPlayer;
      result.skippedInvalidCoordinate += ingested.skippedInvalidCoordinate;
      log(
        `evento ${eventId} — ${ingested.stored} arremessos · sem jogador ${ingested.skippedNoPlayer} · coords inválidas ${ingested.skippedInvalidCoordinate} · ${result.gamesProcessed}/${plan.batch.length}`
      );
    } catch (error) {
      if (error instanceof ShotCoordinatesUnavailableError) {
        result.coordinatesUnavailable = true;
        log(`PARADA — ${error.message}`);
        break;
      }
      result.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      log(`FAIL evento ${eventId} — ${message}`);
    }
  }

  result.deferred = pending.length - result.gamesProcessed;
  return result;
}
