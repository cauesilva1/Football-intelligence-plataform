import type { PlayerFilters } from "@/types";
import type { Sport } from "@/lib/sport";

export type SoccerRankingSlug = "u23" | "finishers" | "creators" | "hidden-gems";
export type BasketballRankingSlug = "u23" | "scorers" | "playmakers" | "rebounders" | "bargains";
export type AmericanFootballRankingSlug =
  | "u23"
  | "quarterbacks"
  | "skill"
  | "defense"
  | "bargains";
export type RankingSlug =
  | SoccerRankingSlug
  | BasketballRankingSlug
  | AmericanFootballRankingSlug;

export interface RankingPreset {
  slug: RankingSlug;
  title: string;
  description: string;
  href: string;
  filters: PlayerFilters;
}

const SOCCER_PRESETS: RankingPreset[] = [
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

const BASKETBALL_PRESETS: RankingPreset[] = [
  {
    slug: "u23",
    title: "Prospects U23",
    description: "High-rated young players — draft upside and development potential.",
    href: "/rankings/u23",
    filters: {
      sport: "BASKETBALL",
      maxAge: 23,
      minRating: 7,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "scorers",
    title: "Melhores pontuadores",
    description: "Points-per-game leaders (PPG).",
    href: "/rankings/scorers",
    filters: {
      sport: "BASKETBALL",
      minPoints: 10,
      minMinutes: 200,
      sortBy: "points",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "playmakers",
    title: "Melhores armadores",
    description: "Assists-per-game leaders (APG).",
    href: "/rankings/playmakers",
    filters: {
      sport: "BASKETBALL",
      minAssists: 3,
      minMinutes: 200,
      sortBy: "assists",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "rebounders",
    title: "Melhores reboteiros",
    description: "Rebounds-per-game leaders (RPG).",
    href: "/rankings/rebounders",
    filters: {
      sport: "BASKETBALL",
      minRebounds: 5,
      minMinutes: 200,
      sortBy: "rebounds",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "bargains",
    title: "Bargains (cap hit)",
    description: "Strong rating with a relatively affordable salary.",
    href: "/rankings/bargains",
    filters: {
      sport: "BASKETBALL",
      maxAge: 28,
      minRating: 7,
      maxCapHit: 12_000_000,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
];

const AMERICAN_FOOTBALL_PRESETS: RankingPreset[] = [
  {
    slug: "u23",
    title: "Prospects U23",
    description: "High-rated young players — draft upside and development potential.",
    href: "/rankings/u23",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      maxAge: 23,
      minRating: 7,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "quarterbacks",
    title: "Quarterbacks",
    description: "QBs sorted by rating on the synced roster.",
    href: "/rankings/quarterbacks",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      position: "QB",
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "skill",
    title: "Skill positions",
    description: "RB / WR / TE with the best rating in the database.",
    href: "/rankings/skill",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      position: "RB,WR,TE,HB,FB",
      minRating: 6.5,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "defense",
    title: "Defesa",
    description: "LB / CB / S / DL with high rating.",
    href: "/rankings/defense",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      position: "LB,ILB,OLB,MLB,CB,S,SS,FS,DL,DE,DT,NT",
      minRating: 6.5,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "bargains",
    title: "Cap bargains",
    description: "Strong rating with an affordable Cap Hit (when available).",
    href: "/rankings/bargains",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      maxAge: 28,
      minRating: 7,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
];

/** @deprecated Prefer getRankingPresets(sport) */
export const RANKING_PRESETS = SOCCER_PRESETS;

export function getRankingPresets(sport: Sport = "SOCCER"): RankingPreset[] {
  if (sport === "BASKETBALL") return BASKETBALL_PRESETS;
  if (sport === "AMERICAN_FOOTBALL") return AMERICAN_FOOTBALL_PRESETS;
  return SOCCER_PRESETS;
}

export function getRankingPreset(
  slug: string,
  sport: Sport = "SOCCER"
): RankingPreset | undefined {
  return getRankingPresets(sport).find((p) => p.slug === slug);
}

export function allRankingSlugs(): RankingSlug[] {
  const set = new Set<RankingSlug>();
  for (const p of [
    ...SOCCER_PRESETS,
    ...BASKETBALL_PRESETS,
    ...AMERICAN_FOOTBALL_PRESETS,
  ]) {
    set.add(p.slug);
  }
  return [...set];
}
