import { AMERICAN_FOOTBALL_COMPETITIONS } from "@/lib/tournaments/american-football-competitions";
import { BASKETBALL_COMPETITIONS } from "@/lib/tournaments/basketball-competitions";
import { HOCKEY_COMPETITIONS } from "@/lib/tournaments/hockey-competitions";
import { SOCCER_COMPETITIONS } from "@/lib/tournaments/soccer-competitions";
import type { SportConfig } from "@/lib/sport-registry";

export interface TournamentSlug {
  slug: string;
}

export type TournamentsLanding =
  | { kind: "hub"; slug: string }
  | { kind: "index" };

/** One tournament skips the index. Two or more keep the list. */
export function tournamentsLanding(competitions: readonly TournamentSlug[]): TournamentsLanding {
  if (competitions.length === 1 && competitions[0]) {
    return { kind: "hub", slug: competitions[0].slug };
  }
  return { kind: "index" };
}

export function competitionCatalog(hubKind: SportConfig["hubKind"]): TournamentSlug[] {
  switch (hubKind) {
    case "hockey":
      return HOCKEY_COMPETITIONS;
    case "basketball":
      return BASKETBALL_COMPETITIONS;
    case "american-football":
      return AMERICAN_FOOTBALL_COMPETITIONS;
    case "soccer":
      return SOCCER_COMPETITIONS;
  }
}
