export type Sport = "SOCCER" | "BASKETBALL" | "AMERICAN_FOOTBALL";

export const SPORT_COOKIE = "fip-sport";

export const BASKETBALL_COMPETITION_NAMES = ["NBA", "NCAA Men's Basketball"] as const;

export const AMERICAN_FOOTBALL_COMPETITION_NAMES = ["NFL", "College Football"] as const;

export { BASKETBALL_POSITIONS } from "@/lib/positions";

import {
  competitionBelongsToSport,
  getSportConfig,
  parseSportId,
} from "@/lib/sport-registry";

export function isBasketballCompetition(name: string): boolean {
  return competitionBelongsToSport(name, "BASKETBALL");
}

export function isAmericanFootballCompetition(name: string): boolean {
  return competitionBelongsToSport(name, "AMERICAN_FOOTBALL");
}

export function sportLabel(sport: Sport): string {
  return getSportConfig(sport).label;
}

export function parseSport(value?: string | null): Sport {
  return parseSportId(value);
}

export { competitionBelongsToSport, getSportConfig };
