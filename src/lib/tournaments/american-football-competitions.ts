export type AmericanFootballCompetitionKind = "pro" | "college";

export interface AmericanFootballCompetitionConfig {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  kind: AmericanFootballCompetitionKind;
  /** ESPN football league path segment */
  espnSlug: string;
  competitionLabel: string;
  badge: string;
  teamsLeagueParam: "nfl" | "cfb";
  hasStandings: boolean;
  hasSchedule: boolean;
  hasLeaders: boolean;
}

export const AMERICAN_FOOTBALL_COMPETITIONS: AmericanFootballCompetitionConfig[] = [
  {
    slug: "nfl",
    name: "NFL",
    shortName: "NFL",
    description:
      "Classificação por conferência e divisão, líderes (passe, corrida, recepção), agenda e 32 franquias.",
    kind: "pro",
    espnSlug: "nfl",
    competitionLabel: "NFL",
    badge: "Profissional",
    teamsLeagueParam: "nfl",
    hasStandings: true,
    hasSchedule: true,
    hasLeaders: true,
  },
  {
    slug: "college-football",
    name: "College Football",
    shortName: "CFB",
    description:
      "Conferências elite (SEC, Big Ten, Big 12, ACC, Pac-12), classificação, jogos e programas. Sem dump de D-II/FCS.",
    kind: "college",
    espnSlug: "college-football",
    competitionLabel: "College Football",
    badge: "Universitário",
    teamsLeagueParam: "cfb",
    hasStandings: true,
    hasSchedule: true,
    hasLeaders: true,
  },
];

export function getAmericanFootballCompetition(
  slug: string
): AmericanFootballCompetitionConfig | undefined {
  return AMERICAN_FOOTBALL_COMPETITIONS.find((c) => c.slug === slug);
}

export function isAmericanFootballCompetitionSlug(slug: string): boolean {
  return AMERICAN_FOOTBALL_COMPETITIONS.some((c) => c.slug === slug);
}
