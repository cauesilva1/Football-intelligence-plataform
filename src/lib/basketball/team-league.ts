import { isBasketballCompetition } from "@/lib/sport";

export type BasketballLeagueCode = "NBA" | "NCAA" | "EUROLEAGUE";

export function resolveBasketballLeagueFromCompetition(
  competitionName?: string | null
): BasketballLeagueCode | null {
  if (competitionName === "NBA") return "NBA";
  if (competitionName?.toLowerCase().includes("ncaa")) return "NCAA";
  if (competitionName?.toLowerCase().includes("euroleague")) return "EUROLEAGUE";
  return null;
}

export function isBasketballTeamCompetition(competitionName?: string | null): boolean {
  return isBasketballCompetition(competitionName ?? "");
}
