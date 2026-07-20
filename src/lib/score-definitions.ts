/**
 * Short, interview-ready definitions for dashboard score segments.
 * Keep aligned with docs/SCORING.md and src/lib/scoring.ts.
 */
export const SCORE_DEFINITIONS = {
  topProspects:
    "U23 players who meet a minimum performance rating (and a reliable minutes sample in soccer).",
  bestPerformers: "Players with the highest overall rating in the current dataset.",
  marketOpportunities:
    "Players combining strong performance indicators with a lower estimated market value (soccer: ≤ €8M, ≥ 450', rating ≥ 7.2).",
  topScorers:
    "Highest Goals/90 among players with a reliable minutes sample (≥ 450'). Soft-capped rates.",
} as const;
