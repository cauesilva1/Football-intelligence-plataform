export type Sport = "SOCCER" | "BASKETBALL";

export const SPORT_COOKIE = "fip-sport";

export const BASKETBALL_COMPETITION_NAMES = ["NBA", "NCAA Men's Basketball"] as const;

export const BASKETBALL_POSITIONS = ["Armador", "Ala-Armador", "Ala", "Ala-Pivô", "Pivô"] as const;

export function isBasketballCompetition(name: string): boolean {
  return (BASKETBALL_COMPETITION_NAMES as readonly string[]).includes(name);
}

export function sportLabel(sport: Sport): string {
  return sport === "BASKETBALL" ? "Basquete" : "Futebol";
}

export function parseSport(value?: string | null): Sport {
  return value === "BASKETBALL" ? "BASKETBALL" : "SOCCER";
}
