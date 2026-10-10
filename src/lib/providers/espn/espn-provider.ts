import { fetchEspnScoreboard } from "@/lib/api/espn-matches";
import { fetchEspnClubRoster } from "@/lib/api/espn-roster";
import { backfillNbaShotChartSeasons } from "@/lib/basketball/nba-shot-sync";
import { getPrisma } from "@/lib/prisma";
import { parseSoccerEventKey } from "@/lib/soccer/shot-league-order";
import {
  isSoccerShotEventType,
  parseSoccerShotPlay,
  type ParsedSoccerShot,
} from "@/lib/soccer/espn-shot-parse";
import type {
  BasketballShotBackfillOptions,
  BasketballShotBackfillSummary,
  CanonicalGame,
  CanonicalRosterPlayer,
  CanonicalShotEvent,
  DataProvider,
  PendingShotGame,
  ShotEventPage,
} from "@/lib/providers/types";

const PLAYS_PAGE = 100;
const SHOT_CACHE_PREFIX = "espn:soccer:shot:v1:";

interface PlaysPage {
  count?: number;
  pageCount?: number;
  items?: Array<{
    $ref?: string;
    type?: { type?: string };
  }>;
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

/** Page the play list and download only shot finalizations. */
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

export function toCanonicalShot(shot: ParsedSoccerShot): CanonicalShotEvent {
  return {
    externalPlayId: shot.externalPlayId,
    shooterName: shot.shooterName,
    x: shot.x,
    y: shot.y,
    converted: shot.converted,
    zone: shot.zone,
    shotType: shot.shotType,
    realXg: null,
  };
}

export const espnProvider: DataProvider = {
  id: "espn",

  async listGames(leagueKey: string, on: Date): Promise<CanonicalGame[]> {
    const events = await fetchEspnScoreboard(leagueKey, leagueKey, { date: on });
    return events.map((event) => ({
      leagueKey,
      eventId: event.externalKey.split(":").pop() ?? event.externalKey,
      externalEventKey: event.externalKey,
      homeTeamName: event.homeTeamName,
      awayTeamName: event.awayTeamName,
      startsAt: event.matchDate.toISOString(),
    }));
  },

  async listPendingShotGames(leagueKey: string): Promise<PendingShotGame[]> {
    const prisma = getPrisma();
    const prefix = `espn:${leagueKey}:`;
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
      const parsed = parseSoccerEventKey(game.key);
      if (done.has(game.key) || !parsed || parsed.slug !== leagueKey) return [];
      return [
        {
          key: game.key,
          leagueKey: parsed.slug,
          eventId: parsed.eventId,
          season: game.season ?? 0,
        },
      ];
    });
  },

  async fetchShotEvents(game: PendingShotGame): Promise<ShotEventPage> {
    const plays = await fetchSoccerShotPlays(game.leagueKey, game.eventId);
    const shots: CanonicalShotEvent[] = [];
    let skippedInvalidCoordinate = 0;
    let skippedNoPlayer = 0;
    for (const play of plays) {
      const shot = parseSoccerShotPlay(play as Parameters<typeof parseSoccerShotPlay>[0]);
      if (shot === "invalid") {
        skippedInvalidCoordinate += 1;
        continue;
      }
      if (shot === "no-player") {
        skippedNoPlayer += 1;
        continue;
      }
      if (shot === "not-a-shot") continue;
      shots.push(toCanonicalShot(shot));
    }
    return { shots, skippedInvalidCoordinate, skippedNoPlayer };
  },

  async fetchRoster(leagueKey: string, teamName: string): Promise<CanonicalRosterPlayer[]> {
    const players = await fetchEspnClubRoster(teamName, leagueKey);
    return players.map((player) => ({
      externalId: player.espnAthleteId,
      fullName: player.fullName,
      position: player.position || null,
    }));
  },

  shotCacheKey(externalEventKey: string): string {
    return `${SHOT_CACHE_PREFIX}${externalEventKey}`;
  },

  backfillBasketballShots(
    options: BasketballShotBackfillOptions
  ): Promise<BasketballShotBackfillSummary[]> {
    return backfillNbaShotChartSeasons(options);
  },

  async fetchSeasonMetrics(): Promise<[]> {
    return [];
  },
};
