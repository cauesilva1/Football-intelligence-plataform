import { isBasketballCompetition } from "@/lib/sport";

export type BasketballLeagueCode = "NBA" | "NCAA";

export function resolveBasketballLeagueFromCompetition(
  competitionName?: string | null
): BasketballLeagueCode | null {
  if (competitionName === "NBA") return "NBA";
  if (competitionName?.toLowerCase().includes("ncaa")) return "NCAA";
  return null;
}

export function isBasketballTeamCompetition(competitionName?: string | null): boolean {
  return isBasketballCompetition(competitionName ?? "");
}
