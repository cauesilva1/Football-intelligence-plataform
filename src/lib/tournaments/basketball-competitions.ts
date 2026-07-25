export type BasketballCompetitionKind = "pro" | "college";

export interface BasketballCompetitionConfig {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  kind: BasketballCompetitionKind;
  /**
   * ESPN basketball league path segment — empty for EuroLeague
   * (official api-live.euroleague.net spine).
   */
  espnSlug: string;
  competitionLabel: string;
  badge: string;
  teamsLeagueParam: "nba" | "ncaa" | "euroleague";
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
      "Standings by conference, leaders (points, rebounds, assists, steals, and blocks), schedule, and franchises.",
    kind: "pro",
    espnSlug: "nba",
    competitionLabel: "NBA",
    badge: "Professional",
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
      "Standings by conference, leaders, games, and programs for scouting. The 2026/27 season begins in November.",
    kind: "college",
    espnSlug: "mens-college-basketball",
    competitionLabel: "NCAA Men's Basketball",
    badge: "College",
    teamsLeagueParam: "ncaa",
    hasStandings: true,
    hasSchedule: true,
    hasLeaders: true,
  },
  {
    slug: "euroleague",
    name: "EuroLeague",
    shortName: "EuroLeague",
    description:
      "Europe's top club competition — clubs, rosters, and match lines via the official EuroLeague API.",
    kind: "pro",
    espnSlug: "euroleague",
    competitionLabel: "EuroLeague",
    badge: "Professional",
    teamsLeagueParam: "euroleague",
    hasStandings: false,
    hasSchedule: false,
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
