import { cache } from "react";
import { getTeamRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { logSupabaseError } from "@/lib/db-errors";
import {
  resolveCompetitionIdFromLeagueParam,
  resolveTeamLeagueTabs,
} from "@/features/scouting/lib/team-league-filters";
import { attachTeamLiveStats } from "@/lib/team-live-stats";
import { resolveClubCrestUrlSync } from "@/lib/crests/club-crests";
import { ensureBrasileiraoCompetition } from "@/lib/sync/brasileirao-bootstrap";
import { getServerSport } from "@/lib/sport-server";
import { isBasketballCompetition } from "@/lib/sport";
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

  if (sport === "SOCCER") {
    try {
      await ensureBrasileiraoCompetition();
    } catch (error) {
      console.warn("[teams] Brasileirão bootstrap skipped:", error);
    }
  }

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

  return resolveCompetitionIdFromLeagueParam(leagueParam, tabs);
});

export const queryTeams = cache(async (competitionId?: string) => {
  await ensureRuntimeDataSource();
  const sport = await getServerSport();
  let teams = await withSupabaseErrorLog("queryTeams", () =>
    getTeamRepository().findAll(competitionId)
  );

  if (sport === "BASKETBALL") {
    teams = teams.filter((team) => isBasketballCompetition(team.competition?.name ?? ""));
  } else {
    teams = teams.filter((team) => !isBasketballCompetition(team.competition?.name ?? ""));
  }

  const enriched = sport === "BASKETBALL" ? teams : await attachTeamLiveStats(teams);
  return enriched.map((team) => {
    const withLive = team as TeamWithStatsBomb;
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
    sport === "BASKETBALL" ? [team] : await attachTeamLiveStats([team]);
  if (!enriched) return null;

  return {
    ...enriched,
    crestUrl:
      resolveClubCrestUrlSync(enriched.name, enriched.crestUrl, enriched.apiSportsId) ??
      enriched.crestUrl,
  } as TeamWithStatsBomb;
});
