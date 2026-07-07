import type { PlayerStatistic } from "@/types";

export interface PlayerStatus {
  label: string;
  description: string;
  variant: "default" | "azure" | "amber" | "neutral";
}

/** Derives squad role from minutes and appearances (mock-season context). */
export function derivePlayerStatus(stats: PlayerStatistic): PlayerStatus {
  const { minutesPlayed, appearances, rating } = stats;

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
  if (rating >= 7.2 && minutesPlayed < 600) {
    return {
      label: "Prospect",
      description: "High impact in limited minutes",
      variant: "amber",
    };
  }
  return {
    label: "Squad Player",
    description: "Reduced minutes this season",
    variant: "neutral",
  };
}
