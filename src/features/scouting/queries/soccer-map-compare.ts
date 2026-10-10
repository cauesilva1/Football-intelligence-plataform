import { getPlayerRepository } from "@/features/scouting/repository";
import { querySoccerShotChart, type SoccerShotChartModel } from "@/features/scouting/queries/soccer-shot-chart";
import { formatSeasonLabel } from "@/lib/format/season-label";
import { sharedTrackedSeasons } from "@/lib/soccer/map-compare";
import { getPrisma } from "@/lib/prisma";
import type { PlayerLite } from "@/types";

export interface MapComparePlayer {
  id: string;
  name: string;
  teamName: string | null;
}

export interface SoccerMapPair {
  playerA: string;
  playerB: string;
  season: string;
}

function parseSeason(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const compact = value.trim().replace("/", "");
  if (!/^\d{4}(\d{2})?$/.test(compact)) return null;
  const season = Number(compact);
  return Number.isInteger(season) ? season : null;
}

async function seasonsFor(playerId: string): Promise<number[]> {
  const rows = await getPrisma().$queryRaw<Array<{ season: number }>>`
    SELECT DISTINCT season
    FROM soccer_shots
    WHERE "playerId" = ${playerId}
    ORDER BY season DESC
  `;
  return rows.map((row) => row.season);
}

async function topPlayersInSeason(season: number, take: number, excludeId?: string): Promise<string[]> {
  const rows = await getPrisma().$queryRaw<Array<{ playerId: string }>>`
    SELECT "playerId"
    FROM soccer_shots
    WHERE season = ${season}
      AND (${excludeId ?? ""} = '' OR "playerId" <> ${excludeId ?? ""})
    GROUP BY "playerId"
    ORDER BY COUNT(*) DESC, "playerId" ASC
    LIMIT ${take}
  `;
  return rows.map((row) => row.playerId);
}

async function busiestSeason(): Promise<number | null> {
  const rows = await getPrisma().$queryRaw<Array<{ season: number }>>`
    SELECT season
    FROM soccer_shots
    GROUP BY season
    ORDER BY COUNT(*) DESC, season DESC
    LIMIT 1
  `;
  return rows[0]?.season ?? null;
}

/** Two highest-volume players who share a tracked season, so the view can open with maps. */
export async function queryDefaultSoccerMapPair(input: {
  playerA?: string;
  playerB?: string;
  season?: string;
}): Promise<SoccerMapPair | null> {
  const requested = parseSeason(input.season);
  const anchor = input.playerA || input.playerB || "";

  if (anchor) {
    const seasons = await seasonsFor(anchor);
    const season = requested != null && seasons.includes(requested) ? requested : seasons[0];
    if (season == null) return null;
    const [other] = await topPlayersInSeason(season, 1, anchor);
    if (!other) return null;
    const playerA = input.playerA || other;
    const playerB = input.playerB || (input.playerA ? other : anchor);
    if (playerA === playerB) return null;
    return { playerA, playerB, season: String(season) };
  }

  const season = requested ?? (await busiestSeason());
  if (season == null) return null;
  const [playerA, playerB] = await topPlayersInSeason(season, 2);
  if (!playerA || !playerB) return null;
  return { playerA, playerB, season: String(season) };
}

export async function querySoccerMapPlayers(ids: string[]): Promise<PlayerLite[]> {
  return getPlayerRepository().findLite("SOCCER", { take: 2, ensureIds: ids });
}

export async function querySoccerMapComparison(
  playerA: string,
  playerB: string,
  seasonParam: string | undefined
): Promise<{
  players: MapComparePlayer[];
  season: string;
  seasons: Array<{ key: string; label: string }>;
  charts: [SoccerShotChartModel, SoccerShotChartModel] | null;
} | null> {
  const prisma = getPrisma();
  const records = await prisma.player.findMany({
    where: { id: { in: [playerA, playerB] }, sport: "SOCCER" },
    select: { id: true, knownAs: true, fullName: true, team: { select: { name: true } } },
  });
  const byId = new Map(records.map((row) => [row.id, row]));
  const a = byId.get(playerA);
  const b = byId.get(playerB);
  if (!a || !b) return null;

  const shared = sharedTrackedSeasons(await seasonsFor(playerA), await seasonsFor(playerB));
  const requested = parseSeason(seasonParam);
  const season = requested != null && shared.includes(requested) ? requested : shared[0];
  const seasons = shared.map((value) => ({
    key: String(value),
    label: formatSeasonLabel(String(value)),
  }));
  const players: MapComparePlayer[] = [a, b].map((row) => ({
    id: row.id,
    name: row.knownAs || row.fullName,
    teamName: row.team?.name ?? null,
  }));
  if (season == null) {
    return { players, season: "", seasons, charts: null };
  }
  const charts = await Promise.all([
    querySoccerShotChart(playerA, String(season)),
    querySoccerShotChart(playerB, String(season)),
  ]);
  return { players, season: String(season), seasons, charts: [charts[0], charts[1]] };
}
