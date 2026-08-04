import { cache } from "react";
import { logSupabaseError } from "@/lib/db-errors";
import { getEspnStatsForTeam, preloadEspnLeague } from "@/lib/crests/espn-standings";
import type { AggregatedTeamStats } from "./aggregate-team-stats";

function hasMeaningfulStats(stats: AggregatedTeamStats | null | undefined): boolean {
  if (!stats) return false;
  return stats.matchesPlayed > 0 || stats.wins > 0 || stats.goalsFor > 0;
}

/**
 * Team standings for UI — ESPN live only.
 * StatsBomb open-data archives are stale and must not feed Clubs / team detail.
 */
export const getStatsBombStatsForTeam = cache(
  async (
    teamName: string,
    competitionName?: string | null
  ): Promise<AggregatedTeamStats | null> => {
    try {
      const espnStats = await getEspnStatsForTeam(teamName, competitionName);
      if (hasMeaningfulStats(espnStats)) return espnStats;
    } catch (error) {
      logSupabaseError(`getLiveTeamStats:espn:${teamName}`, error);
    }
    return null;
  }
);

/** @deprecated name kept for call sites — preloads ESPN standings, not StatsBomb. */
export const preloadStatsBombLeague = cache(async (competitionName?: string | null) => {
  if (!competitionName) return;
  try {
    await preloadEspnLeague(competitionName);
  } catch {
    // ESPN unavailable — callers fall back to DB TeamStatistic
  }
});
