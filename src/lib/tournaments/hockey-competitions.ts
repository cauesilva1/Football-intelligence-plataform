export interface HockeyCompetitionConfig {
  slug: string;
  name: string;
  shortName: string;
  description: string;
}

export const HOCKEY_COMPETITIONS: HockeyCompetitionConfig[] = [
  {
    slug: "nhl",
    name: "NHL",
    shortName: "NHL",
    description: "2026-27 regular season — standings, results, and upcoming games from the official NHL feed.",
  },
];

export function isHockeyCompetitionSlug(slug: string): boolean {
  return HOCKEY_COMPETITIONS.some((competition) => competition.slug === slug);
}

export function getHockeyCompetition(slug: string): HockeyCompetitionConfig | undefined {
  return HOCKEY_COMPETITIONS.find((competition) => competition.slug === slug);
}
