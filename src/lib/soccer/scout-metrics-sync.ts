import { getPrisma } from "@/lib/prisma";
import { fbrefScoutLeague, FBREF_SCOUT_LEAGUES } from "@/lib/providers/fbref/scout-leagues";
import { scoutMetricsProvider } from "@/lib/providers/registry";
import type { DataProvider } from "@/lib/providers/types";
import { matchShooterId, type ShotRosterPlayer } from "@/lib/soccer/shot-name-match";

export interface ScoutMetricsSyncResult {
  leagueKey: string;
  fetched: number;
  stored: number;
  unmatched: number;
}

async function rosterForLeague(competitionName: string): Promise<ShotRosterPlayer[]> {
  const players = await getPrisma().player.findMany({
    where: { sport: "SOCCER", team: { competition: { name: competitionName } } },
    select: { id: true, fullName: true, knownAs: true },
  });
  return players.map((player) => ({
    playerId: player.id,
    fullName: player.fullName,
    knownAs: player.knownAs,
  }));
}

export async function syncScoutMetrics(
  provider: DataProvider = scoutMetricsProvider(),
  leagueKeys: string[] = FBREF_SCOUT_LEAGUES.map((league) => league.leagueKey)
): Promise<ScoutMetricsSyncResult[]> {
  if (!provider.fetchSeasonMetrics) {
    throw new Error(`Provider ${provider.id} does not supply season scout metrics`);
  }
  const results: ScoutMetricsSyncResult[] = [];
  for (const leagueKey of leagueKeys) {
    const league = fbrefScoutLeague(leagueKey);
    if (!league) continue;
    const metrics = await provider.fetchSeasonMetrics(leagueKey);
    const roster = await rosterForLeague(league.competitionName);
    const rows: Array<{ playerId: string; metric: string; value: number }> = [];
    const unmatched = new Set<string>();
    for (const metric of metrics) {
      const playerId = matchShooterId(metric.playerName, roster);
      if (!playerId) {
        unmatched.add(metric.playerName);
        continue;
      }
      rows.push({ playerId, metric: metric.metric, value: metric.value });
    }
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.scoutMetric.deleteMany({
        where: { leagueKey, season: league.season, provider: provider.id },
      });
      if (rows.length) {
        await tx.scoutMetric.createMany({
          data: rows.map((row) => ({
            playerId: row.playerId,
            season: league.season,
            metric: row.metric,
            value: row.value,
            provider: provider.id,
            leagueKey,
          })),
          skipDuplicates: true,
        });
      }
    });
    results.push({
      leagueKey,
      fetched: metrics.length,
      stored: rows.length,
      unmatched: unmatched.size,
    });
  }
  return results;
}
