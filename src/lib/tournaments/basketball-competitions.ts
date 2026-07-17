export type BasketballCompetitionKind = "pro" | "college";

export interface BasketballCompetitionConfig {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  kind: BasketballCompetitionKind;
  /** ESPN basketball league path segment */
  espnSlug: string;
  competitionLabel: string;
  badge: string;
  teamsLeagueParam: "nba" | "ncaa";
  hasStandings: boolean;
  hasSchedule: boolean;
  hasLeaders: boolean;
}

export const BASKETBALL_COMPETITIONS: BasketballCompetitionConfig[] = [
  {
    slug: "nba",
    name: "NBA",
    shortName: "NBA",
    description:
      "Classificação por conferência, líderes (pontos, rebotes, assistências, roubos e tocos), agenda e franquias.",
    kind: "pro",
    espnSlug: "nba",
    competitionLabel: "NBA",
    badge: "Profissional",
    teamsLeagueParam: "nba",
    hasStandings: true,
    hasSchedule: true,
    hasLeaders: true,
  },
  {
    slug: "ncaa",
    name: "NCAA Men's Basketball",
    shortName: "NCAA",
    description:
      "Classificação por conferência, líderes, jogos e programas para scouting. Temporada 2026/27 começa em novembro.",
    kind: "college",
    espnSlug: "mens-college-basketball",
    competitionLabel: "NCAA Men's Basketball",
    badge: "Universitário",
    teamsLeagueParam: "ncaa",
    hasStandings: true,
    hasSchedule: true,
    hasLeaders: true,
  },
];

export function getBasketballCompetition(
  slug: string
): BasketballCompetitionConfig | undefined {
  return BASKETBALL_COMPETITIONS.find((c) => c.slug === slug);
}

export function isBasketballCompetitionSlug(slug: string): boolean {
  return BASKETBALL_COMPETITIONS.some((c) => c.slug === slug);
}
