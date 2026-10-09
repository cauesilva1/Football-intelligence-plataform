import { nbaShotChartSeasons } from "@/lib/basketball/season";
import { getPrisma } from "@/lib/prisma";
import {
  espnNbaEventId,
  parseEspnBasketballDefense,
  parseEspnBasketballShots,
} from "@/lib/basketball/espn-shot-parse";
import {
  NBA_SHOT_CHART_MAX_GAMES_PER_RUN,
  NBA_SHOT_CHART_MIN_GAME_MS,
  selectShotBackfillBatch,
} from "@/lib/basketball/shot-backfill-plan";

const SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";
const SHOT_CACHE_PREFIX = "espn:basketball:nba:court:v2:";

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
  defensiveStored: number;
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
/** Bare ESPN event id, so `401704627` and `espn:nba:401704627` are one game. */
export function canonicalNbaShotGameId(eventId: string): string {
  const trimmed = eventId.trim();
  const fromKey = espnNbaEventId(trimmed.startsWith("espn:nba:") ? trimmed : `espn:nba:${trimmed}`);
  return fromKey ?? trimmed;
}

export function dedupeShotPlays<T extends { externalPlayId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    if (!row.externalPlayId || seen.has(row.externalPlayId)) continue;
    seen.add(row.externalPlayId);
    unique.push(row);
  }
  return unique;
}

export async function ingestNbaShotsFromSummary(input: {
  eventId: string;
  summary: unknown;
  season: number;
}): Promise<IngestShotsResult> {
  const parsed = parseEspnBasketballShots(input.summary);
  const defense = parseEspnBasketballDefense(input.summary);
  if (!parsed.coordinatesAvailable) {
    throw new ShotCoordinatesUnavailableError(input.eventId);
  }

  const prisma = getPrisma();
  const athleteIds = [
    ...new Set(
      [...parsed.shots, ...defense.plays].map((event) => Number.parseInt(event.espnAthleteId, 10))
    ),
  ].filter((id) => Number.isFinite(id));
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

  const gameId = canonicalNbaShotGameId(input.eventId);
  const gameIds = [...new Set([gameId, input.eventId.trim()].filter(Boolean))];
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
  const defensiveRows: Array<{
    playerId: string;
    gameId: string;
    externalPlayId: string;
    x: number;
    y: number;
    kind: string;
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
      gameId,
      externalPlayId: shot.externalPlayId,
      x: shot.x,
      y: shot.y,
      made: shot.made,
      zone: shot.zone,
      shotType: shot.shotType,
      season: input.season,
    });
  }
  for (const play of defense.plays) {
    const playerId = playerByEspnId.get(Number.parseInt(play.espnAthleteId, 10));
    if (!playerId) {
      skippedNoPlayer += 1;
      continue;
    }
    defensiveRows.push({
      playerId,
      gameId,
      externalPlayId: play.externalPlayId,
      x: play.x,
      y: play.y,
      kind: play.kind,
      season: input.season,
    });
  }

  const shotRows = dedupeShotPlays(rows);
  const defenseRows = dedupeShotPlays(defensiveRows);

  await prisma.$transaction(async (tx) => {
    await tx.basketballShot.deleteMany({ where: { gameId: { in: gameIds } } });
    await tx.basketballDefensivePlay.deleteMany({ where: { gameId: { in: gameIds } } });
    if (shotRows.length) {
      await tx.basketballShot.createMany({ data: shotRows, skipDuplicates: true });
    }
    if (defenseRows.length) {
      await tx.basketballDefensivePlay.createMany({ data: defenseRows, skipDuplicates: true });
    }
    await tx.systemCache.upsert({
      where: { key: `${SHOT_CACHE_PREFIX}${gameId}` },
      create: {
        key: `${SHOT_CACHE_PREFIX}${gameId}`,
        json: {
          eventId: input.eventId,
          season: input.season,
          stored: shotRows.length,
          defensiveStored: defenseRows.length,
          skippedNoPlayer,
          processedAt: new Date().toISOString(),
        },
      },
      update: {
        json: {
          eventId: input.eventId,
          season: input.season,
          stored: shotRows.length,
          defensiveStored: defenseRows.length,
          skippedNoPlayer,
          processedAt: new Date().toISOString(),
        },
      },
    });
  });

  return {
    eventId: input.eventId,
    stored: shotRows.length,
    skippedNoPlayer,
    skippedInvalidCoordinate: parsed.skippedInvalidCoordinate + defense.skippedInvalidCoordinate,
    skippedFreeThrow: parsed.skippedFreeThrow,
    defensiveStored: defenseRows.length,
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
 * Walk one campaign's games already in the DB.
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
        `evento ${eventId} — ${ingested.stored} arremessos · ${ingested.defensiveStored} roubos/tocos · sem jogador ${ingested.skippedNoPlayer} · coords inválidas ${ingested.skippedInvalidCoordinate} · ${result.gamesProcessed}/${plan.batch.length}`
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

/**
 * Same enumerator as `backfillNbaShotCharts`, across 2024/25, 2025/26, and the
 * current campaign. One shared game cap so a cron run cannot walk every season.
 */
export async function backfillNbaShotChartSeasons(options: {
  deadlineMs: number;
  seasons?: number[];
  maxGames?: number;
  minGameMs?: number;
  log?: (message: string) => void;
}): Promise<NbaShotBackfillResult[]> {
  const seasons = options.seasons?.length ? options.seasons : nbaShotChartSeasons();
  const maxGames = options.maxGames ?? NBA_SHOT_CHART_MAX_GAMES_PER_RUN;
  const minGameMs = options.minGameMs ?? NBA_SHOT_CHART_MIN_GAME_MS;
  let remainingGames = maxGames;
  const results: NbaShotBackfillResult[] = [];

  for (const season of seasons) {
    if (remainingGames <= 0) break;
    if (Date.now() + minGameMs > options.deadlineMs) break;

    const result = await backfillNbaShotCharts({
      season,
      deadlineMs: options.deadlineMs,
      maxGames: remainingGames,
      minGameMs,
      log: options.log,
    });
    results.push(result);
    remainingGames -= result.gamesProcessed;
    if (result.stoppedForTime || result.coordinatesUnavailable) break;
  }

  return results;
}
