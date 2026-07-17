import { cache } from "react";
import { getTeamRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { logSupabaseError } from "@/lib/db-errors";
import {
  competitionMatchesLeagueKey,
  resolveCompetitionIdFromLeagueParam,
  resolveTeamLeagueTabs,
} from "@/features/scouting/lib/team-league-filters";
import { attachTeamLiveStats } from "@/lib/team-live-stats";
import { attachBasketballTeamLiveStats } from "@/lib/basketball/team-live-stats";
import { resolveClubCrestUrlSync } from "@/lib/crests/club-crests";
import { getServerSport } from "@/lib/sport-server";
import { competitionBelongsToSport, getSportConfig } from "@/lib/sport-registry";
import type { AggregatedTeamStats } from "@/lib/statsbomb/aggregate-team-stats";
import type { Competition, Player, Team, TeamStatistic } from "@/types";

export type TeamWithStatsBomb = Team & {
  competition?: Competition;
  stats?: TeamStatistic;
  statsBomb?: AggregatedTeamStats;
  squadSize?: number;
  squad?: Player[];
};

async function withSupabaseErrorLog<T>(context: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logSupabaseError(context, error);
    throw error;
  }
}

export const queryCompetitions = cache(async () => {
  await ensureRuntimeDataSource();
  return withSupabaseErrorLog("queryCompetitions", () => getTeamRepository().getCompetitions());
});

export const queryTeamLeagueTabs = cache(async () => {
  await ensureRuntimeDataSource();
  const sport = await getServerSport();
  const config = getSportConfig(sport);

  // Bootstrap in background — never block the directory.
  void config.runBootstrap().catch((error) => {
    console.warn(`[teams] ${sport} bootstrap skipped:`, error);
  });

  const competitions = await withSupabaseErrorLog("queryTeamLeagueTabs", () =>
    getTeamRepository().getCompetitions()
  );
  return resolveTeamLeagueTabs(competitions, sport);
});

export const queryCompetitionIdForLeague = cache(async (leagueParam?: string) => {
  await ensureRuntimeDataSource();
  const sport = await getServerSport();
  const tabs = await queryTeamLeagueTabs();

  if (sport === "BASKETBALL" && leagueParam === "nba") {
    return tabs.find((tab) => tab.key === "nba")?.competitionId;
  }
  if (sport === "BASKETBALL" && leagueParam === "ncaa") {
    return tabs.find((tab) => tab.key === "ncaa")?.competitionId;
  }
  if (sport === "AMERICAN_FOOTBALL" && leagueParam === "nfl") {
    return tabs.find((tab) => tab.key === "nfl")?.competitionId;
  }
  if (sport === "AMERICAN_FOOTBALL" && (leagueParam === "cfb" || leagueParam === "college-football")) {
    return tabs.find((tab) => tab.key === "cfb")?.competitionId;
  }

  return resolveCompetitionIdFromLeagueParam(leagueParam, tabs);
});

export const queryTeams = cache(
  async (competitionId?: string, leagueKey?: string, options?: { enrich?: boolean }) => {
  await ensureRuntimeDataSource();
  const sport = await getServerSport();
  const shouldEnrich = options?.enrich === true;

  let teams = await withSupabaseErrorLog("queryTeams", () =>
    getTeamRepository().findAll(competitionId)
  );

  teams = teams.filter((team) =>
    competitionBelongsToSport(team.competition?.name ?? "", sport)
  );

  if (leagueKey && leagueKey !== "all") {
    teams = teams.filter((team) =>
      competitionMatchesLeagueKey(team.competition?.name, leagueKey, sport)
    );
  }

  if (!shouldEnrich) {
    return teams.map((team) => ({
      ...team,
      crestUrl:
        resolveClubCrestUrlSync(team.name, team.crestUrl, team.apiSportsId) ?? team.crestUrl,
    }));
  }

  if (sport === "BASKETBALL") {
    const needsCap = (!leagueKey || leagueKey === "all") && !competitionId && teams.length > 40;
    const forLive = needsCap ? teams.slice(0, 40) : teams;
    const enriched = await attachBasketballTeamLiveStats(forLive);
    const enrichedById = new Map(enriched.map((t) => [t.id, t]));

    return teams.map((team) => {
      const withLive = (enrichedById.get(team.id) ?? team) as TeamWithStatsBomb;
      return {
        ...withLive,
        crestUrl:
          resolveClubCrestUrlSync(withLive.name, withLive.crestUrl, withLive.apiSportsId) ??
          withLive.crestUrl,
      };
    });
  }

  if (sport === "AMERICAN_FOOTBALL") {
    return teams.map((team) => ({
      ...team,
      crestUrl:
        resolveClubCrestUrlSync(team.name, team.crestUrl, team.apiSportsId) ?? team.crestUrl,
    }));
  }

  // Cap live enrichment only on the unfiltered list — filtered leagues are ~20 clubs.
  const needsCap = (!leagueKey || leagueKey === "all") && !competitionId && teams.length > 40;
  const forLive = needsCap ? teams.slice(0, 40) : teams;
  const enriched = await attachTeamLiveStats(forLive);

  const enrichedById = new Map(enriched.map((t) => [t.id, t]));

  return teams.map((team) => {
    const withLive = (enrichedById.get(team.id) ?? team) as TeamWithStatsBomb;
    return {
      ...withLive,
      crestUrl:
        resolveClubCrestUrlSync(
          withLive.name,
          withLive.crestUrl ?? withLive.statsBomb?.crestUrl,
          withLive.apiSportsId
        ) ?? withLive.crestUrl,
    };
  });
});

export const queryTeamById = cache(async (id: string) => {
  await ensureRuntimeDataSource();
  const sport = await getServerSport();
  const team = await withSupabaseErrorLog("queryTeamById", () => getTeamRepository().findById(id));
  if (!team) return null;

  const [enriched] =
    sport === "BASKETBALL"
      ? await attachBasketballTeamLiveStats([team])
      : sport === "AMERICAN_FOOTBALL"
        ? [team]
        : await attachTeamLiveStats([team]);
  if (!enriched) return null;

  return {
    ...enriched,
    crestUrl:
      resolveClubCrestUrlSync(enriched.name, enriched.crestUrl, enriched.apiSportsId) ??
      enriched.crestUrl,
  } as TeamWithStatsBomb;
});
