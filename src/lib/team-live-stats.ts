import { isDbSource } from "@/lib/data-source";
import { logSupabaseError } from "@/lib/db-errors";
import { getEspnStatsForTeam, preloadEspnLeague } from "@/lib/crests/espn-standings";
import { resolvePersistedSeasonLabel } from "@/lib/seasons";
import {
  getStatsBombStatsForTeam,
  preloadStatsBombLeague,
} from "@/lib/statsbomb/team-stats-service";
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
    statsBombCompetitionName: competitionName ? `${competitionName} · Supabase` : "Supabase",
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

async function resolveDbModeTeamStats(
  teamName: string,
  competitionName: string | undefined,
  dbStats?: TeamStatistic
): Promise<AggregatedTeamStats | null> {
  const expectedSeason = resolvePersistedSeasonLabel(competitionName);

  // Read-only on list/detail pages — never upsert here (saturates Supabase pool).
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

/** Attaches live standings for display only (no DB writes). */
export async function attachTeamLiveStats<
  T extends { id?: string; name: string; competition?: Competition; stats?: TeamStatistic },
>(teams: T[]): Promise<(T & { statsBomb?: AggregatedTeamStats; stats?: TeamStatistic })[]> {
  const leagues = new Set(
    teams.map((t) => t.competition?.name).filter((name): name is string => Boolean(name))
  );

  if (isDbSource()) {
    await Promise.all([...leagues].map((name) => preloadEspnLeague(name)));

    // Sequential map would be too slow; ESPN lookups are memory-cached after preload.
    return Promise.all(
      teams.map(async (team) => {
        const statsBomb = await resolveDbModeTeamStats(
          team.name,
          team.competition?.name,
          team.stats
        );

        return {
          ...team,
          statsBomb: statsBomb ?? undefined,
          stats: statsBomb ? toDisplayStatsFromAggregated(statsBomb) : team.stats,
        };
      })
    );
  }

  await Promise.all([...leagues].map((name) => preloadStatsBombLeague(name)));

  return Promise.all(
    teams.map(async (team) => {
      let statsBomb = await getStatsBombStatsForTeam(team.name, team.competition?.name);

      if (!statsBomb && team.stats) {
        statsBomb = dbStatsToAggregated(team.name, team.stats, team.competition?.name);
      }

      return {
        ...team,
        statsBomb: statsBomb ?? undefined,
        stats: statsBomb ? toDisplayStatsFromAggregated(statsBomb) : team.stats,
      };
    })
  );
}
