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
    const page = await queryTeamsDirectory(competitionId, leagueKey, {
      enrich: options?.enrich,
      page: 1,
      pageSize: 500,
    });
    return page.items;
  }
);

export const queryTeamsDirectory = cache(
  async (
    competitionId?: string,
    leagueKey?: string,
    options?: { enrich?: boolean; page?: number; pageSize?: number }
  ) => {
    await ensureRuntimeDataSource();
    const sport = await getServerSport();
    const shouldEnrich = options?.enrich === true;
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(Math.max(options?.pageSize ?? 48, 1), 100);

    const competitions = await withSupabaseErrorLog("queryTeamsDirectory.competitions", () =>
      getTeamRepository().getCompetitions()
    );

    let competitionIds = competitions
      .filter((c) => competitionBelongsToSport(c.name, sport))
      .filter(
        (c) =>
          !leagueKey ||
          leagueKey === "all" ||
          competitionMatchesLeagueKey(c.name, leagueKey, sport)
      )
      .map((c) => c.id);

    if (competitionId) {
      competitionIds = competitionIds.filter((id) => id === competitionId);
    }

    const { items: teams, total } = await withSupabaseErrorLog("queryTeamsDirectory", () =>
      getTeamRepository().findDirectory({
        competitionIds,
        take: pageSize,
        skip: (page - 1) * pageSize,
        includeStats: shouldEnrich || sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL",
      })
    );

    if (!shouldEnrich) {
      return {
        total,
        page,
        pageSize,
        items: teams.map((team) => ({
          ...team,
          crestUrl:
            resolveClubCrestUrlSync(team.name, team.crestUrl, team.apiSportsId) ?? team.crestUrl,
        })) as TeamWithStatsBomb[],
      };
    }

    if (sport === "BASKETBALL") {
      const enriched = await attachBasketballTeamLiveStats(teams);
      const enrichedById = new Map(enriched.map((t) => [t.id, t]));
      return {
        total,
        page,
        pageSize,
        items: teams.map((team) => {
          const withLive = (enrichedById.get(team.id) ?? team) as TeamWithStatsBomb;
          return {
            ...withLive,
            crestUrl:
              resolveClubCrestUrlSync(withLive.name, withLive.crestUrl, withLive.apiSportsId) ??
              withLive.crestUrl,
          };
        }),
      };
    }

    if (sport === "AMERICAN_FOOTBALL") {
      return {
        total,
        page,
        pageSize,
        items: teams.map((team) => ({
          ...team,
          crestUrl:
            resolveClubCrestUrlSync(team.name, team.crestUrl, team.apiSportsId) ?? team.crestUrl,
        })) as TeamWithStatsBomb[],
      };
    }

    const enriched = await attachTeamLiveStats(teams);
    const enrichedById = new Map(enriched.map((t) => [t.id, t]));

    return {
      total,
      page,
      pageSize,
      items: teams.map((team) => {
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
      }),
    };
  }
);

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
