import type { PlayerFilters } from "@/types";
import type { Sport } from "@/lib/sport";
import {
  SOCCER_HIDDEN_GEM_FILTERS,
  SOCCER_U23_RANKING_FILTERS,
} from "@/lib/scoring/soccer-rankings";

export type SoccerRankingSlug =
  | "u23"
  | "finishers"
  | "creators"
  | "defenders"
  | "hidden-gems";
export type BasketballRankingSlug =
  | "u23"
  | "scorers"
  | "playmakers"
  | "rebounders"
  | "bargains"
  | "three-and-d"
  | "rim-protectors";
export type AmericanFootballRankingSlug =
  | "u23"
  | "quarterbacks"
  | "skill"
  | "defense"
  | "yards"
  | "touchdowns"
  | "sacks"
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
    description:
      "Same rules as dashboard Top Prospects: U23, rating ≥ 7.0, and ≥ 450' in the current season.",
    href: "/rankings/u23",
    filters: {
      ...SOCCER_U23_RANKING_FILTERS,
      page: 1,
      pageSize: 20,
    },
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
    slug: "defenders",
    title: "Defensive Actions",
    description:
      "Centre-backs and full-backs ranked by tackles + interceptions per 90 (≥450′).",
    href: "/rankings/defenders",
    filters: {
      position: "CB,LB,RB,LWB,RWB",
      minMinutes: 450,
      minRating: 6.5,
      sortBy: "defensiveActionsPer90",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
    },
  },
  {
    slug: "hidden-gems",
    title: "Hidden Gems",
    description:
      "Strong rating (≥ 7.2), age ≤ 25, value ≤ €8M, and ≥ 450' — ranked by rating per million euro.",
    href: "/rankings/hidden-gems",
    filters: {
      ...SOCCER_HIDDEN_GEM_FILTERS,
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
      minMinutes: 200,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "scorers",
    title: "Top Scorers",
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
    title: "Top Playmakers",
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
    title: "Top Rebounders",
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
    description:
      "Rating ≥ 7.0, age ≤ 28, Cap Hit ≤ $12M, ≥ 200' — ranked by rating per $1M Cap Hit (NBA ESPN salaries; NCAA/EuroLeague usually blank).",
    href: "/rankings/bargains",
    filters: {
      sport: "BASKETBALL",
      maxAge: 28,
      minRating: 7,
      minMinutes: 200,
      maxCapHit: 12_000_000,
      sortBy: "valueScore",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "three-and-d",
    title: "3&D Wings",
    description: "Perimeter shooting with defensive disruption (steal rate).",
    href: "/rankings/three-and-d",
    filters: {
      sport: "BASKETBALL",
      minMinutes: 200,
      minSteals: 1,
      archetype: "three-and-d",
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "rim-protectors",
    title: "Rim Protectors",
    description: "Blocks and rebounding for bigs who own the paint.",
    href: "/rankings/rim-protectors",
    filters: {
      sport: "BASKETBALL",
      minMinutes: 200,
      minBlocks: 1,
      archetype: "rim-protector",
      sortBy: "blocks",
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
    description: "High-rated young players with a reliable sample — draft upside.",
    href: "/rankings/u23",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      maxAge: 23,
      minRating: 7,
      minMinutes: 360,
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
      minMinutes: 360,
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
      minMinutes: 360,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "defense",
    title: "Defense",
    description: "LB / CB / S / DL with high rating.",
    href: "/rankings/defense",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      position: "LB,ILB,OLB,MLB,CB,S,SS,FS,DL,DE,DT,NT",
      minRating: 6.5,
      minMinutes: 360,
      sortBy: "rating",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "yards",
    title: "Yards / game",
    description: "Pass + rush + receiving yards per game — production rate leaders.",
    href: "/rankings/yards",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      minMinutes: 360,
      minYardsPerGame: 40,
      sortBy: "yardsPerGame",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "touchdowns",
    title: "Touchdown production",
    description: "Players with meaningful TD/game rates (reliable sample).",
    href: "/rankings/touchdowns",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      minMinutes: 360,
      minTouchdownsPerGame: 0.3,
      sortBy: "touchdowns",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "sacks",
    title: "Sack production",
    description: "Pass-rushers with elevated sacks per game.",
    href: "/rankings/sacks",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      position: "LB,ILB,OLB,MLB,DL,DE,DT,NT,EDGE",
      minMinutes: 360,
      minSacksPerGame: 0.2,
      sortBy: "sacks",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      route: "scouting",
    },
  },
  {
    slug: "bargains",
    title: "Market Opportunities",
    description:
      "Rating ≥ 7.0, age ≤ 28, Cap Hit ≤ $5M (NFL ESPN salary) — ranked by rating per $1M Cap Hit. CFB has no Cap Hit feed.",
    href: "/rankings/bargains",
    filters: {
      sport: "AMERICAN_FOOTBALL",
      maxAge: 28,
      minRating: 7,
      minMinutes: 360,
      maxCapHit: 5_000_000,
      sortBy: "valueScore",
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
