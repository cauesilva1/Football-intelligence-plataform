import { logSupabaseError } from "@/lib/db-errors";
import { getEspnStatsForTeam, preloadEspnLeague } from "@/lib/crests/espn-standings";
import { resolvePersistedSeasonLabel } from "@/lib/seasons";
import type { AggregatedTeamStats } from "@/lib/statsbomb/aggregate-team-stats";
import type { Competition, TeamStatistic } from "@/types";

function hasMeaningfulStats(stats?: TeamStatistic | AggregatedTeamStats | null): boolean {
  if (!stats) return false;
  return stats.matchesPlayed > 0 || stats.wins > 0 || stats.goalsFor > 0;
}

export function dbStatsToAggregated(
  teamName: string,
  stats: TeamStatistic,
  competitionName?: string
): AggregatedTeamStats {
  return {
    teamName,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    goalsFor: stats.goalsFor,
    goalsAgainst: stats.goalsAgainst,
    matchesPlayed: stats.matchesPlayed,
    goalBalance: stats.goalsFor - stats.goalsAgainst,
    seasonLabel: stats.season,
    statsBombCompetitionName: competitionName ? `${competitionName} · DB` : "DB",
  };
}

export function toDisplayStatsFromAggregated(sb: AggregatedTeamStats): TeamStatistic {
  return {
    id: `live-${sb.teamName}`,
    teamId: "",
    season: sb.seasonLabel,
    matchesPlayed: sb.matchesPlayed,
    wins: sb.wins,
    draws: sb.draws,
    losses: sb.losses,
    goalsFor: sb.goalsFor,
    goalsAgainst: sb.goalsAgainst,
    xG: 0,
    xGA: 0,
    possessionPct: 0,
    passAccuracyPct: 0,
    pressuresPer90: 0,
    attackRating: 0,
    defenseRating: 0,
  };
}

/**
 * Real standings only: ESPN live table, then persisted TeamStatistic.
 * StatsBomb open-data archives are intentionally not used (stale seasons).
 */
async function resolveLiveTeamStats(
  teamName: string,
  competitionName: string | undefined,
  dbStats?: TeamStatistic
): Promise<AggregatedTeamStats | null> {
  const expectedSeason = resolvePersistedSeasonLabel(competitionName);

  try {
    const espnStats = await getEspnStatsForTeam(teamName, competitionName);
    if (hasMeaningfulStats(espnStats)) {
      return {
        ...espnStats!,
        seasonLabel: espnStats!.seasonLabel || expectedSeason,
        statsBombCompetitionName: `${espnStats!.statsBombCompetitionName} · ESPN`,
      };
    }
  } catch (error) {
    logSupabaseError(`getEspnStatsForTeam:${teamName}`, error);
  }

  if (dbStats && hasMeaningfulStats(dbStats)) {
    return dbStatsToAggregated(teamName, dbStats, competitionName);
  }

  return null;
}

/** Attaches live standings for display only (no DB writes). ESPN + DB — never StatsBomb. */
export async function attachTeamLiveStats<
  T extends { id?: string; name: string; competition?: Competition; stats?: TeamStatistic },
>(teams: T[]): Promise<(T & { statsBomb?: AggregatedTeamStats; stats?: TeamStatistic })[]> {
  const leagues = new Set(
    teams.map((t) => t.competition?.name).filter((name): name is string => Boolean(name))
  );

  await Promise.all([...leagues].map((name) => preloadEspnLeague(name)));

  return Promise.all(
    teams.map(async (team) => {
      const live = await resolveLiveTeamStats(team.name, team.competition?.name, team.stats);

      return {
        ...team,
        // Legacy field name kept for callers; value is ESPN/DB only.
        statsBomb: live ?? undefined,
        stats: live ? toDisplayStatsFromAggregated(live) : team.stats,
      };
    })
  );
}
