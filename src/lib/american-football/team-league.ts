import { isAmericanFootballCompetition } from "@/lib/sport";

export type AmericanFootballLeagueCode = "NFL" | "CFB";

export function resolveAmericanFootballLeagueFromCompetition(
  competitionName?: string | null
): AmericanFootballLeagueCode | null {
  if (!competitionName) return null;
  const lower = competitionName.toLowerCase();
  if (lower === "nfl" || lower.includes("national football")) return "NFL";
  if (lower.includes("college football") || lower === "cfb") return "CFB";
  return null;
}

export function isAmericanFootballTeamCompetition(
  competitionName?: string | null
): boolean {
  return isAmericanFootballCompetition(competitionName ?? "");
}
