/**
 * Short, interview-ready definitions for dashboard score segments.
 * Keep aligned with docs/SCORING.md and src/lib/scoring.ts.
 */
export const SCORE_DEFINITIONS = {
  topProspects:
    "U23 players who meet a minimum performance rating and a reliable sample (soccer minutes / BB·AF games).",
  bestPerformers: "Players with the highest overall rating in the current dataset (reliable sample only).",
  marketOpportunities:
    "Strong rating, age ≤ 25, reliable sample — soccer ≤ €8M market value; NBA/NFL ≤ $5M Cap Hit (no Cap Hit feed for NCAA, EuroLeague, or CFB).",
  topScorers:
    "Highest Goals/90 among players with a reliable minutes sample (≥ 450'). Soft-capped rates.",
} as const;
