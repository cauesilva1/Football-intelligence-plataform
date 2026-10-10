export const SCOUT_METRIC_MIN_COHORT = 8;

export interface ScoutMetricCopy {
  id: string;
  label: string;
  explainer: string;
}

export const SCOUT_METRIC_COPY: ScoutMetricCopy[] = [
  {
    id: "progressive_passes",
    label: "Progressive passes",
    explainer: "Completed passes that move the ball at least 10 yards toward the opponent's goal, or any completed pass into the penalty area.",
  },
  {
    id: "progressive_carries",
    label: "Progressive carries",
    explainer: "Carries that move the ball at least 10 yards toward the opponent's goal, or any carry into the penalty area.",
  },
  {
    id: "sca",
    label: "Shot-creating actions",
    explainer: "The two offensive actions directly before a shot, such as a pass, a take-on, or a foul drawn.",
  },
  {
    id: "gca",
    label: "Goal-creating actions",
    explainer: "The two offensive actions directly before a goal.",
  },
  {
    id: "xa",
    label: "Expected assists",
    explainer: "The expected goals of the shots that followed a pass from this player.",
  },
  {
    id: "pressures",
    label: "Pressures",
    explainer: "Times the player closed down an opponent who was receiving, carrying, or releasing the ball.",
  },
  {
    id: "passes_final_third",
    label: "Passes into the final third",
    explainer: "Completed passes that enter the attacking third.",
  },
  {
    id: "passes_penalty_area",
    label: "Passes into the penalty area",
    explainer: "Completed passes that enter the opponent's penalty area.",
  },
];

const COPY_BY_ID = new Map(SCOUT_METRIC_COPY.map((item) => [item.id, item]));

export function scoutMetricCopy(id: string): ScoutMetricCopy | null {
  return COPY_BY_ID.get(id) ?? null;
}

/** Inclusive percentile, 0–100. Hidden until the league cohort is large enough. */
export function scoutPercentile(value: number, cohort: number[]): number | null {
  if (cohort.length < SCOUT_METRIC_MIN_COHORT) return null;
  let below = 0;
  let equal = 0;
  for (const sample of cohort) {
    if (sample < value) below += 1;
    else if (sample === value) equal += 1;
  }
  return Math.round(((below + equal * 0.5) / cohort.length) * 100);
}

export function formatScoutValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
