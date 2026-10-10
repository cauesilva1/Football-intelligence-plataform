import { getPrisma } from "@/lib/prisma";
import { matchShooterId, type ShotRosterPlayer } from "@/lib/soccer/shot-name-match";
import { soccerShotGameId, soccerShotLeagueOrder } from "@/lib/soccer/shot-league-order";
import {
  NBA_SHOT_CHART_MIN_GAME_MS,
  selectShotBackfillBatch,
} from "@/lib/basketball/shot-backfill-plan";
import { providerFor } from "@/lib/providers/registry";
import type { DataProvider, PendingShotGame } from "@/lib/providers/types";

export const SOCCER_SHOT_MAX_GAMES_PER_RUN = 10;

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

/** Boxscore lines plus both clubs' squads. A name that matches nobody stays unmatched. */
async function rosterForEvent(externalEventKey: string): Promise<ShotRosterPlayer[]> {
  const prisma = getPrisma();
  const appearances = await prisma.playerMatchStat.findMany({
    where: { externalEventKey },
    select: {
      teamName: true,
      opponentName: true,
      playerId: true,
      player: { select: { fullName: true, knownAs: true } },
    },
  });
  const clubNames = [
    ...new Set(
      appearances
        .flatMap((row) => [row.teamName, row.opponentName])
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name))
    ),
  ];
  const squad =
    clubNames.length === 0
      ? []
      : await prisma.player.findMany({
          where: {
            sport: "SOCCER",
            OR: clubNames.map((name) => ({
              team: { name: { equals: name, mode: "insensitive" } },
            })),
          },
          select: { id: true, fullName: true, knownAs: true },
        });
  const byId = new Map<string, ShotRosterPlayer>();
  for (const row of appearances) {
    byId.set(row.playerId, {
      playerId: row.playerId,
      fullName: row.player.fullName,
      knownAs: row.player.knownAs,
    });
  }
  for (const player of squad) {
    if (byId.has(player.id)) continue;
    byId.set(player.id, {
      playerId: player.id,
      fullName: player.fullName,
      knownAs: player.knownAs,
    });
  }
  return [...byId.values()];
}

export async function ingestSoccerShotEvent(
  provider: DataProvider,
  game: PendingShotGame
): Promise<{
  stored: number;
  skippedNoPlayer: number;
  skippedInvalidCoordinate: number;
}> {
  const page = await provider.fetchShotEvents(game);
  const prisma = getPrisma();
  const roster = await rosterForEvent(game.key);

  const gameId = soccerShotGameId(game.leagueKey, game.eventId);
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
  let skippedNoPlayer = page.skippedNoPlayer;
  for (const shot of page.shots) {
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
      season: game.season,
    });
  }

  const storedSeason = game.season > 0 ? game.season : new Date().getUTCFullYear();
  if (rows.length === 0 && page.shots.length > 0) {
    return {
      stored: 0,
      skippedNoPlayer,
      skippedInvalidCoordinate: page.skippedInvalidCoordinate,
    };
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
      where: { key: provider.shotCacheKey(game.key) },
      create: {
        key: provider.shotCacheKey(game.key),
        json: {
          eventKey: game.key,
          season: storedSeason,
          stored: rows.length,
          skippedNoPlayer,
          skippedInvalidCoordinate: page.skippedInvalidCoordinate,
          processedAt: new Date().toISOString(),
        },
      },
      update: {
        json: {
          eventKey: game.key,
          season: storedSeason,
          stored: rows.length,
          skippedNoPlayer,
          skippedInvalidCoordinate: page.skippedInvalidCoordinate,
          processedAt: new Date().toISOString(),
        },
      },
    });
  });

  return {
    stored: rows.length,
    skippedNoPlayer,
    skippedInvalidCoordinate: page.skippedInvalidCoordinate,
  };
}

/**
 * Walk games already stored, MLS first. One shared cap of 10 games.
 * The league's configured provider supplies the queue and the shot events.
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

    const provider = providerFor("soccer", slug);
    const pending = await provider.listPendingShotGames(slug);
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
        const ingested = await ingestSoccerShotEvent(provider, game);
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
