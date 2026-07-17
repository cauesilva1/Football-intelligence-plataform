import { getTeamRepository, isDbSource } from "@/features/scouting/repository";
import { LEAGUES } from "@/features/scouting/lib/constants";
import { TEAM_OPTIONS, type TeamOption } from "@/features/scouting/lib/teams-options";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import {
  BASKETBALL_COMPETITION_NAMES,
  competitionBelongsToSport,
  type Sport,
} from "@/lib/sport";

export interface LeagueOption {
  id: string;
  name: string;
}

/** Soft cap when no league is selected — avoids shipping every NCAA/CFB program. */
const UNFILTERED_TEAM_CAP = 80;

function filterLeaguesBySport<T extends { name: string }>(items: T[], sport: Sport): T[] {
  return items.filter((item) => competitionBelongsToSport(item.name, sport));
}

export async function queryScoutingFilterOptions(
  sport: Sport = "SOCCER",
  options?: { leagueId?: string }
): Promise<{
  leagues: LeagueOption[];
  teams: TeamOption[];
}> {
  if (!isDbSource()) {
    const leagues = filterLeaguesBySport(
      LEAGUES.map((l) => ({ id: l.id, name: l.name })),
      sport
    );
    const leagueIds = new Set<string>(leagues.map((league) => league.id));
    let teams = TEAM_OPTIONS.filter((team) => leagueIds.has(team.leagueId));
    if (options?.leagueId) {
      teams = teams.filter((team) => team.leagueId === options.leagueId);
    } else {
      teams = teams.slice(0, UNFILTERED_TEAM_CAP);
    }
    return { leagues, teams };
  }

  await ensureRuntimeDataSource();
  const repo = getTeamRepository();
  const competitions = await repo.getCompetitions();
  const leagues = filterLeaguesBySport(
    competitions.map((c) => ({ id: c.id, name: c.name })),
    sport
  );
  const leagueIds = leagues.map((league) => league.id);
  const selectedLeague =
    options?.leagueId && leagueIds.includes(options.leagueId) ? options.leagueId : undefined;

  const { items: teams } = await repo.findDirectory({
    competitionIds: selectedLeague ? [selectedLeague] : leagueIds,
    includeStats: false,
    take: selectedLeague ? 120 : UNFILTERED_TEAM_CAP,
  });

  return {
    leagues,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      leagueId: t.competitionId,
    })),
  };
}

export { BASKETBALL_COMPETITION_NAMES };
