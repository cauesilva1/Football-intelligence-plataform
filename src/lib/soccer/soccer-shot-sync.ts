import { getPrisma } from "@/lib/prisma";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import {
  parseSoccerShotPlay,
  isSoccerShotEventType,
  type ParsedSoccerShot,
} from "@/lib/soccer/espn-shot-parse";
import { parseSoccerEventKey, soccerShotGameId, soccerShotLeagueOrder } from "@/lib/soccer/shot-league-order";
import {
  NBA_SHOT_CHART_MIN_GAME_MS,
  selectShotBackfillBatch,
} from "@/lib/basketball/shot-backfill-plan";

export const SOCCER_SHOT_MAX_GAMES_PER_RUN = 10;
const SHOT_CACHE_PREFIX = "espn:soccer:shot:v1:";
const PLAYS_PAGE = 100;

export interface SoccerShotBackfillResult {
  slug: string;
  pendingAtStart: number;
  gamesProcessed: number;
  shotsStored: number;
  skippedNoPlayer: number;
  skippedInvalidCoordinate: number;
  failed: number;
  deferred: number;
  stoppedForTime: boolean;
}

interface PlaysPage {
  count?: number;
  pageCount?: number;
  items?: Array<{
    $ref?: string;
    type?: { type?: string };
  }>;
}

function matchShooterId(
  name: string,
  roster: Array<{ playerId: string; fullName: string; knownAs: string }>
): string | null {
  const hits = roster.filter(
    (player) => namesLikelyMatch(player.fullName, name) || namesLikelyMatch(player.knownAs, name)
  );
  if (hits.length === 1) return hits[0].playerId;
  const exact = hits.filter((player) => {
    const shot = name.toLowerCase();
    return player.fullName.toLowerCase() === shot || player.knownAs.toLowerCase() === shot;
  });
  return exact.length === 1 ? exact[0].playerId : null;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (soccer-shot-chart)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`ESPN plays HTTP ${response.status}`);
  }
  return response.json();
}

/** Page the play list and download only finalizations. */
export async function fetchSoccerShotPlays(slug: string, eventId: string): Promise<unknown[]> {
  const shots: unknown[] = [];
  let page = 1;
  let pageCount = 1;
  while (page <= pageCount && page <= 40) {
    const url = `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(slug)}/events/${eventId}/competitions/${eventId}/plays?limit=${PLAYS_PAGE}&page=${page}`;
    const payload = (await fetchJson(url)) as PlaysPage;
    pageCount = payload.pageCount ?? 1;
    for (const item of payload.items ?? []) {
      if (!isSoccerShotEventType(item.type?.type) || !item.$ref) continue;
      shots.push(await fetchJson(item.$ref));
    }
    page += 1;
  }
  return shots;
}

async function listPending(slug: string): Promise<Array<{ key: string; season: number }>> {
  const prisma = getPrisma();
  const prefix = `espn:${slug}:`;
  const [games, cached] = await Promise.all([
    prisma.$queryRaw<Array<{ key: string; season: number | null }>>`
      SELECT "externalEventKey" AS key, MIN(season)::int AS season
      FROM player_match_stats
      WHERE "externalEventKey" LIKE ${prefix + "%"}
      GROUP BY "externalEventKey"
      ORDER BY MIN("matchDate") ASC NULLS LAST
    `,
    prisma.systemCache.findMany({
      where: { key: { startsWith: SHOT_CACHE_PREFIX } },
      select: { key: true },
    }),
  ]);
  const done = new Set(cached.map((row) => row.key.slice(SHOT_CACHE_PREFIX.length)));
  return games.flatMap((game) => {
    if (done.has(game.key) || !parseSoccerEventKey(game.key)) return [];
    return [{ key: game.key, season: game.season ?? 0 }];
  });
}

export async function ingestSoccerShotEvent(externalEventKey: string, season: number): Promise<{
  stored: number;
  skippedNoPlayer: number;
  skippedInvalidCoordinate: number;
}> {
  const parsedKey = parseSoccerEventKey(externalEventKey);
  if (!parsedKey) throw new Error(`Not a soccer ESPN key: ${externalEventKey}`);

  const plays = await fetchSoccerShotPlays(parsedKey.slug, parsedKey.eventId);
  const parsed: ParsedSoccerShot[] = [];
  let skippedInvalidCoordinate = 0;
  let skippedNoPlayer = 0;
  for (const play of plays) {
    const shot = parseSoccerShotPlay(play as Parameters<typeof parseSoccerShotPlay>[0]);
    if (shot === "invalid") {
      skippedInvalidCoordinate += 1;
      continue;
    }
    if (shot === "no-player" || shot === "not-a-shot") {
      if (shot === "no-player") skippedNoPlayer += 1;
      continue;
    }
    parsed.push(shot);
  }

  const prisma = getPrisma();
  const appearances = await prisma.playerMatchStat.findMany({
    where: { externalEventKey },
    select: { playerId: true, player: { select: { fullName: true, knownAs: true } } },
  });
  const roster = appearances.map((row) => ({
    playerId: row.playerId,
    fullName: row.player.fullName,
    knownAs: row.player.knownAs,
  }));

  const gameId = soccerShotGameId(parsedKey.slug, parsedKey.eventId);
  const rows: Array<{
    playerId: string;
    gameId: string;
    externalPlayId: string;
    x: number;
    y: number;
    converted: boolean;
    zone: string;
    shotType: string;
    season: number;
  }> = [];
  const seen = new Set<string>();
  for (const shot of parsed) {
    const playerId = shot.shooterName ? matchShooterId(shot.shooterName, roster) : null;
    if (!playerId) {
      skippedNoPlayer += 1;
      continue;
    }
    if (seen.has(shot.externalPlayId)) continue;
    seen.add(shot.externalPlayId);
    rows.push({
      playerId,
      gameId,
      externalPlayId: shot.externalPlayId,
      x: shot.x,
      y: shot.y,
      converted: shot.converted,
      zone: shot.zone,
      shotType: shot.shotType,
      season,
    });
  }

  const storedSeason = season > 0 ? season : new Date().getUTCFullYear();
  if (rows.length === 0 && parsed.length > 0) {
    return { stored: 0, skippedNoPlayer, skippedInvalidCoordinate };
  }
  await prisma.$transaction(async (tx) => {
    await tx.soccerShot.deleteMany({ where: { gameId } });
    if (rows.length) {
      await tx.soccerShot.createMany({
        data: rows.map((row) => ({ ...row, season: storedSeason })),
        skipDuplicates: true,
      });
    }
    await tx.systemCache.upsert({
      where: { key: `${SHOT_CACHE_PREFIX}${externalEventKey}` },
      create: {
        key: `${SHOT_CACHE_PREFIX}${externalEventKey}`,
        json: {
          eventKey: externalEventKey,
          season: storedSeason,
          stored: rows.length,
          skippedNoPlayer,
          skippedInvalidCoordinate,
          processedAt: new Date().toISOString(),
        },
      },
      update: {
        json: {
          eventKey: externalEventKey,
          season: storedSeason,
          stored: rows.length,
          skippedNoPlayer,
          skippedInvalidCoordinate,
          processedAt: new Date().toISOString(),
        },
      },
    });
  });

  return { stored: rows.length, skippedNoPlayer, skippedInvalidCoordinate };
}

/**
 * Walk games already stored, MLS first. One shared cap of 10 games.
 * Completed games are skipped via systemCache.
 */
export async function backfillSoccerShotCharts(options: {
  deadlineMs: number;
  maxGames?: number;
  minGameMs?: number;
  log?: (message: string) => void;
}): Promise<SoccerShotBackfillResult[]> {
  const log = options.log ?? (() => {});
  const maxGames = options.maxGames ?? SOCCER_SHOT_MAX_GAMES_PER_RUN;
  const minGameMs = options.minGameMs ?? NBA_SHOT_CHART_MIN_GAME_MS;
  let remainingGames = maxGames;
  const results: SoccerShotBackfillResult[] = [];

  for (const slug of soccerShotLeagueOrder()) {
    if (remainingGames <= 0) break;
    if (Date.now() + minGameMs > options.deadlineMs) break;

    const pending = await listPending(slug);
    const plan = selectShotBackfillBatch(pending, {
      maxGames: remainingGames,
      remainingMs: options.deadlineMs - Date.now(),
      minGameMs,
    });
    const result: SoccerShotBackfillResult = {
      slug,
      pendingAtStart: pending.length,
      gamesProcessed: 0,
      shotsStored: 0,
      skippedNoPlayer: 0,
      skippedInvalidCoordinate: 0,
      failed: 0,
      deferred: pending.length,
      stoppedForTime: plan.stoppedForTime,
    };
    results.push(result);

    if (!plan.batch.length) {
      log(
        plan.stoppedForTime
          ? `${slug} adiado — ${pending.length} jogo(s) pendente(s)`
          : `${slug} nada pendente`
      );
      if (plan.stoppedForTime) break;
      continue;
    }

    log(`${slug} fila ${pending.length} · nesta rodada até ${plan.batch.length}`);
    for (const game of plan.batch) {
      if (Date.now() + minGameMs > options.deadlineMs) {
        result.stoppedForTime = true;
        break;
      }
      try {
        const ingested = await ingestSoccerShotEvent(game.key, game.season);
        result.gamesProcessed += 1;
        result.shotsStored += ingested.stored;
        result.skippedNoPlayer += ingested.skippedNoPlayer;
        result.skippedInvalidCoordinate += ingested.skippedInvalidCoordinate;
        log(`${game.key} — ${ingested.stored} finalizações`);
      } catch (error) {
        result.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        log(`FAIL ${game.key} — ${message}`);
      }
    }
    result.deferred = pending.length - result.gamesProcessed;
    remainingGames -= result.gamesProcessed;
    if (result.stoppedForTime) break;
  }

  return results;
}
