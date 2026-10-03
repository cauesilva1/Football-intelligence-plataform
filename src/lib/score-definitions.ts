import type { Sport } from "@/lib/sport";

/**
 * Short, interview-ready definitions for dashboard score segments.
 * Keep aligned with docs/SCORING.md and src/lib/scoring.ts.
 */
export const SCORE_DEFINITIONS = {
  topProspects:
    "U23 players with a strong productivity rating and a reliable sample (soccer minutes / BB·AF games).",
  bestPerformers: "Players with the highest productivity rating in the current dataset (reliable sample only).",
  marketOpportunities:
    "Strong rating, age ≤ 25, reliable sample — soccer ≤ €8M market value; NBA/NFL ≤ $5M Cap Hit (no Cap Hit feed for NCAA, EuroLeague, or CFB).",
  topScorers:
    "Highest Goals/90 among players with a reliable minutes sample (≥ 450'). Soft-capped rates.",
} as const;

export type ScoreDefinitions = Record<keyof typeof SCORE_DEFINITIONS, string>;

const SPORT_SCORE_DEFINITIONS: Record<Sport, ScoreDefinitions> = {
  SOCCER: SCORE_DEFINITIONS,
  BASKETBALL: {
    ...SCORE_DEFINITIONS,
    topProspects:
      "U23 players with a strong productivity rating and a reliable sample (≥ 10 games and ≥ 200').",
    marketOpportunities:
      "Strong rating, age ≤ 25, reliable sample, NBA Cap Hit ≤ $5M (no Cap Hit feed for NCAA or EuroLeague).",
  },
  AMERICAN_FOOTBALL: {
    ...SCORE_DEFINITIONS,
    topProspects:
      "U23 players with a strong productivity rating and a reliable sample (≥ 6 games and ≥ 360' proxy).",
    marketOpportunities:
      "Strong rating, age ≤ 25, reliable sample, NFL Cap Hit ≤ $5M (no Cap Hit feed for College Football).",
  },
};

export function scoreDefinitionsFor(sport: Sport): ScoreDefinitions {
  return SPORT_SCORE_DEFINITIONS[sport];
}

/** Sample floor shown under the Top Prospects tile. */
export function dashboardSampleFloorLabel(sport: Sport): string {
  if (sport === "BASKETBALL") return "U23 · rating ≥ 6.25 · ≥10 G / 200'";
  if (sport === "AMERICAN_FOOTBALL") return "U23 · rating ≥ 6.25 · ≥6 G / 360' proxy";
  return "U23 · rating ≥ 6.25 · ≥450'";
}
