import { getTeamRepository, isDbSource } from "@/features/scouting/repository";
import { LEAGUES } from "@/features/scouting/lib/constants";
import { TEAM_OPTIONS, type TeamOption } from "@/features/scouting/lib/teams-options";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { BASKETBALL_COMPETITION_NAMES, isBasketballCompetition, type Sport } from "@/lib/sport";

export interface LeagueOption {
  id: string;
  name: string;
}

function filterLeaguesBySport<T extends { name: string }>(items: T[], sport: Sport): T[] {
  if (sport === "BASKETBALL") {
    return items.filter((item) => isBasketballCompetition(item.name));
  }
  return items.filter((item) => !isBasketballCompetition(item.name));
}

export async function queryScoutingFilterOptions(sport: Sport = "SOCCER"): Promise<{
  leagues: LeagueOption[];
  teams: TeamOption[];
}> {
  if (!isDbSource()) {
    const leagues = filterLeaguesBySport(
      LEAGUES.map((l) => ({ id: l.id, name: l.name })),
      sport
    );
    const leagueIds = new Set<string>(leagues.map((league) => league.id));
    return {
      leagues,
      teams: TEAM_OPTIONS.filter((team) => leagueIds.has(team.leagueId)),
    };
  }

  await ensureRuntimeDataSource();
  const repo = getTeamRepository();
  const [competitions, teams] = await Promise.all([repo.getCompetitions(), repo.findAll()]);

  const leagues = filterLeaguesBySport(
    competitions.map((c) => ({ id: c.id, name: c.name })),
    sport
  );
  const leagueIds = new Set<string>(leagues.map((league) => league.id));

  return {
    leagues,
    teams: teams
      .filter((team) => leagueIds.has(team.competitionId))
      .map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        leagueId: t.competitionId,
      })),
  };
}

export { BASKETBALL_COMPETITION_NAMES };
