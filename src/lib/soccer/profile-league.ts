import { resolvePersistedSeasonLabel } from "@/lib/seasons";

/** League on a soccer profile follows the club's competition, including its season shape. */
export function soccerProfileLeagueLabel(competitionName: string): string {
  return `${competitionName} · ${resolvePersistedSeasonLabel(competitionName)}`;
}
