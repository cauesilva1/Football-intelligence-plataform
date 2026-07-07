import type { TournamentMatch } from "./types";
import { resolveNationalCrestMap } from "@/lib/crests/national-teams";

export async function enrichTournamentMatchesWithCrests(
  matches: TournamentMatch[]
): Promise<TournamentMatch[]> {
  const names = matches.flatMap((match) => [match.homeTeam, match.awayTeam]);
  const crestMap = await resolveNationalCrestMap(names);

  return matches.map((match) => ({
    ...match,
    homeCrestUrl: crestMap[match.homeTeam] ?? match.homeCrestUrl,
    awayCrestUrl: crestMap[match.awayTeam] ?? match.awayCrestUrl,
  }));
}

export async function enrichTournamentRoundsWithCrests<
  T extends { matches: TournamentMatch[] },
>(rounds: T[]): Promise<T[]> {
  const allMatches = rounds.flatMap((round) => round.matches);
  const enriched = await enrichTournamentMatchesWithCrests(allMatches);
  const byId = new Map(enriched.map((match) => [match.id, match]));

  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => byId.get(match.id) ?? match),
  }));
}
