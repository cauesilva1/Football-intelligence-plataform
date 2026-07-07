import { getTeamRepository, isDbSource } from "@/features/scouting/repository";
import { LEAGUES } from "@/features/scouting/lib/constants";
import { TEAM_OPTIONS, type TeamOption } from "@/features/scouting/lib/teams-options";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export interface LeagueOption {
  id: string;
  name: string;
}

export async function queryScoutingFilterOptions(): Promise<{
  leagues: LeagueOption[];
  teams: TeamOption[];
}> {
  if (!isDbSource()) {
    return {
      leagues: LEAGUES.map((l) => ({ id: l.id, name: l.name })),
      teams: TEAM_OPTIONS,
    };
  }

  await ensureRuntimeDataSource();
  const repo = getTeamRepository();
  const [competitions, teams] = await Promise.all([repo.getCompetitions(), repo.findAll()]);

  return {
    leagues: competitions.map((c) => ({ id: c.id, name: c.name })),
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      leagueId: t.competitionId,
    })),
  };
}
