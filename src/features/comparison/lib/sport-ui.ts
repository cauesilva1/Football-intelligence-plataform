import {
  BASKETBALL_COMPARISON_CATEGORIES,
  SOCCER_COMPARISON_CATEGORIES,
  type ComparisonCategory,
  toComparisonProfile,
} from "@/features/comparison/lib/categories";
import { getSportConfig } from "@/lib/sport-registry";
import type { Sport } from "@/lib/sport";

export function comparisonCategoriesForSport(sport: Sport): readonly ComparisonCategory[] {
  if (sport === "BASKETBALL") return BASKETBALL_COMPARISON_CATEGORIES;
  // AF uses basketball-shaped categories until dedicated metrics land.
  if (sport === "AMERICAN_FOOTBALL") return BASKETBALL_COMPARISON_CATEGORIES;
  return SOCCER_COMPARISON_CATEGORIES;
}

export function radarMetricsForSport(sport: Sport): readonly string[] {
  return getSportConfig(sport).ui.radarMetrics;
}

export { toComparisonProfile };
