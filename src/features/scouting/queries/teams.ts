import { cache } from "react";
import { getTeamRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import {
  resolveCompetitionIdFromLeagueParam,
  resolveTeamLeagueTabs,
} from "@/features/scouting/lib/team-league-filters";
import { getStatsBombStatsForTeam, preloadStatsBombLeague } from "@/lib/statsbomb/team-stats-service";
import { resolveClubCrestUrlSync } from "@/lib/crests/club-crests";
import type { AggregatedTeamStats } from "@/lib/statsbomb/aggregate-team-stats";
import type { Competition, Player, Team, TeamStatistic } from "@/types";

export type TeamWithStatsBomb = Team & {
  competition?: Competition;
  stats?: TeamStatistic;
  statsBomb?: AggregatedTeamStats;
  squadSize?: number;
  squad?: Player[];
};

function toDisplayStats(sb: AggregatedTeamStats): TeamStatistic {
  return {
    id: `sb-${sb.teamName}`,
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

function dbStatsToAggregated(
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
    statsBombCompetitionName: competitionName ?? "Liga",
  };
}

async function attachStatsBomb<
  T extends { name: string; competition?: Competition; stats?: TeamStatistic },
>(teams: T[]): Promise<(T & { statsBomb?: AggregatedTeamStats; stats?: TeamStatistic })[]> {
  const leagues = new Set(
    teams.map((t) => t.competition?.name).filter((name): name is string => Boolean(name))
  );

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
        stats: statsBomb ? toDisplayStats(statsBomb) : team.stats,
      };
    })
  );
}

export const queryCompetitions = cache(async () => {
  await ensureRuntimeDataSource();
  return getTeamRepository().getCompetitions();
});

export const queryTeamLeagueTabs = cache(async () => {
  await ensureRuntimeDataSource();
  const competitions = await getTeamRepository().getCompetitions();
  return resolveTeamLeagueTabs(competitions);
});

export const queryCompetitionIdForLeague = cache(async (leagueParam?: string) => {
  await ensureRuntimeDataSource();
  const tabs = await queryTeamLeagueTabs();
  return resolveCompetitionIdFromLeagueParam(leagueParam, tabs);
});

export const queryTeams = cache(async (competitionId?: string) => {
  await ensureRuntimeDataSource();
  const teams = await getTeamRepository().findAll(competitionId);
  const enriched = await attachStatsBomb(teams);
  return enriched.map((team) => ({
    ...team,
    crestUrl:
      resolveClubCrestUrlSync(team.name, team.crestUrl ?? team.statsBomb?.crestUrl, team.apiSportsId) ??
      team.crestUrl,
  }));
});

export const queryTeamById = cache(async (id: string) => {
  await ensureRuntimeDataSource();
  const team = await getTeamRepository().findById(id);
  if (!team) return null;

  const [enriched] = await attachStatsBomb([team]);
  if (!enriched) return null;

  return {
    ...enriched,
    crestUrl:
      resolveClubCrestUrlSync(enriched.name, enriched.crestUrl, enriched.apiSportsId) ??
      enriched.crestUrl,
  } as TeamWithStatsBomb;
});
