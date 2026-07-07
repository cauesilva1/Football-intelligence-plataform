import type { PlayerFilters } from "@/types";

export type RankingSlug = "u23" | "finishers" | "creators" | "hidden-gems";

export interface RankingPreset {
  slug: RankingSlug;
  title: string;
  description: string;
  href: string;
  filters: PlayerFilters;
}

export const RANKING_PRESETS: RankingPreset[] = [
  {
    slug: "u23",
    title: "Best U23 Players",
    description: "Top Rated Academy & Youth Players — high upside potential.",
    href: "/rankings/u23",
    filters: { maxAge: 23, minRating: 7, sortBy: "rating", sortDir: "desc", page: 1, pageSize: 20 },
  },
  {
    slug: "finishers",
    title: "Best Finishers",
    description: "Highest Goal Production per 90 — normalized scoring output.",
    href: "/rankings/finishers",
    filters: {
      minMinutes: 450,
      minGoalsPer90: 0.2,
      sortBy: "goalsPer90",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
    },
  },
  {
    slug: "creators",
    title: "Best Creators",
    description: "Leaders in assists and chance creation per 90.",
    href: "/rankings/creators",
    filters: { minMinutes: 450, sortBy: "assistsPer90", sortDir: "desc", page: 1, pageSize: 20 },
  },
  {
    slug: "hidden-gems",
    title: "Hidden Gems",
    description: "Strong performance with accessible market value.",
    href: "/rankings/hidden-gems",
    filters: {
      maxAge: 25,
      minRating: 7.2,
      maxMarketValue: 8_000_000,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
    },
  },
];

export function getRankingPreset(slug: string): RankingPreset | undefined {
  return RANKING_PRESETS.find((p) => p.slug === slug);
}
