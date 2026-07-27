import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";
import { lookupClubApiSportsId, apiSportsTeamLogoUrl } from "@/lib/crests/club-crests";
import {
  fetchTeamsForLeagueSeason,
  getApiSportsQuotaStatus,
} from "@/lib/api-sports";
import { API_FOOTBALL_PLAYER_MEDIA_SEASON } from "@/lib/seasons";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";

const BIG5_LEAGUE_IDS = [
  { id: 39, label: "Premier League", needles: ["premier"] },
  { id: 140, label: "La Liga", needles: ["la liga"] },
  { id: 135, label: "Serie A", needles: ["serie a"] },
  { id: 78, label: "Bundesliga", needles: ["bundesliga"] },
  { id: 61, label: "Ligue 1", needles: ["ligue 1", "ligue"] },
] as const;

export type EnsureTeamApiSportsIdsResult = {
  fromMap: number;
  fromLeagueSync: number;
  alreadySet: number;
  unresolved: number;
  quota: { used: number; limit: number; date: string };
};

/**
 * Persist Team.apiSportsId for soccer clubs.
 * 1) Static crest map (0 API calls)
 * 2) Optional /teams?league=&season= for Big-5 (1 call per league)
 */
export async function ensureSoccerTeamApiSportsIds(options?: {
  /** Also call API-Football /teams per Big-5 league (≈5 requests). Default true. */
  syncLeagues?: boolean;
}): Promise<EnsureTeamApiSportsIdsResult> {
  const syncLeagues = options?.syncLeagues !== false;
  const prisma = getPrisma();
  const result: EnsureTeamApiSportsIdsResult = {
    fromMap: 0,
    fromLeagueSync: 0,
    alreadySet: 0,
    unresolved: 0,
    quota: await getApiSportsQuotaStatus(),
  };

  if (!isDbSource()) return result;

  const teams = await prisma.team.findMany({
    where: {
      players: { some: { sport: "SOCCER" } },
    },
    select: {
      id: true,
      name: true,
      apiSportsId: true,
      crestUrl: true,
    },
  });

  for (const team of teams) {
    if (team.apiSportsId != null) {
      result.alreadySet += 1;
      continue;
    }
    const mapped = lookupClubApiSportsId(team.name);
    if (mapped == null) continue;
    await prisma.team.update({
      where: { id: team.id },
      data: {
        apiSportsId: mapped,
        crestUrl: team.crestUrl ?? apiSportsTeamLogoUrl(mapped),
      },
    });
    result.fromMap += 1;
  }

  if (syncLeagues) {
    // Free tier: /teams?league=&season= only accepts ≤ 2024; team IDs are stable.
    const season = API_FOOTBALL_PLAYER_MEDIA_SEASON;
    for (const league of BIG5_LEAGUE_IDS) {
      const q = await getApiSportsQuotaStatus();
      if (q.used >= q.limit) break;

      const apiTeams = await fetchTeamsForLeagueSeason(league.id, season);
      if (!apiTeams.length) continue;

      const stillMissing = await prisma.team.findMany({
        where: {
          apiSportsId: null,
          players: { some: { sport: "SOCCER" } },
          competition: {
            OR: league.needles.map((needle) => ({
              name: { contains: needle, mode: "insensitive" as const },
            })),
          },
        },
        select: { id: true, name: true, crestUrl: true },
      });

      for (const team of stillMissing) {
        const hit = apiTeams.find((t) => namesLikelyMatch(t.name, team.name));
        if (!hit) continue;
        await prisma.team.update({
          where: { id: team.id },
          data: {
            apiSportsId: hit.id,
            crestUrl: team.crestUrl ?? hit.logo ?? apiSportsTeamLogoUrl(hit.id),
          },
        });
        result.fromLeagueSync += 1;
      }
    }
  }

  result.unresolved = await prisma.team.count({
    where: {
      apiSportsId: null,
      players: { some: { sport: "SOCCER" } },
    },
  });
  result.quota = await getApiSportsQuotaStatus();
  return result;
}
