import type { PlayerStatistic } from "@/types";
import { SOCCER_RATE_MIN_MINUTES } from "@/lib/scoring";

export interface PlayerStatus {
  label: string;
  description: string;
  variant: "default" | "azure" | "amber" | "neutral";
}

/** Derives squad role from minutes and appearances (current-season context). */
export function derivePlayerStatus(stats: PlayerStatistic): PlayerStatus {
  const { minutesPlayed, appearances, rating } = stats;

  if (minutesPlayed > 0 && minutesPlayed < SOCCER_RATE_MIN_MINUTES) {
    return {
      label: "Small Sample",
      description: `Under ${SOCCER_RATE_MIN_MINUTES}' this season — rates and rating are provisional`,
      variant: "amber",
    };
  }

  if (minutesPlayed >= 1_200 && appearances >= 14) {
    return {
      label: "Starter",
      description: "Consistent minutes this season",
      variant: "default",
    };
  }
  if (minutesPlayed >= 600 && appearances >= 8) {
    return {
      label: "Rotation",
      description: "Regular matchday involvement",
      variant: "azure",
    };
  }
  if (rating >= 7.2 && minutesPlayed >= SOCCER_RATE_MIN_MINUTES) {
    return {
      label: "Prospect",
      description: "Strong rating on a reliable sample",
      variant: "amber",
    };
  }
  return {
    label: "Squad Player",
    description: "Reduced minutes this season",
    variant: "neutral",
  };
}
