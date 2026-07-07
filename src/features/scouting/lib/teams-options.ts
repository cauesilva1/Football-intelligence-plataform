import { teams } from "@/lib/mock-data/teams";
import { LEAGUES } from "./constants";

export interface TeamOption {
  id: string;
  name: string;
  shortName: string;
  leagueId: string;
}

export const TEAM_OPTIONS: TeamOption[] = teams.map((t) => ({
  id: t.id,
  name: t.name,
  shortName: t.shortName,
  leagueId: t.competitionId,
}));

export function getTeamsForLeague(leagueId?: string): TeamOption[] {
  if (!leagueId) return TEAM_OPTIONS;
  return TEAM_OPTIONS.filter((t) => t.leagueId === leagueId);
}

export function getLeagueName(leagueId: string): string | undefined {
  return LEAGUES.find((l) => l.id === leagueId)?.name;
}
