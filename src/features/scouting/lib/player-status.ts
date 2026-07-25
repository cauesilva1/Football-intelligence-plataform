import type { PlayerStatistic } from "@/types";
import {
  AF_RATE_MIN_GAMES,
  AF_RATE_MIN_MINUTES,
  BB_RATE_MIN_GAMES,
  BB_RATE_MIN_MINUTES,
  SOCCER_RATE_MIN_MINUTES,
} from "@/lib/scoring";

export interface PlayerStatus {
  label: string;
  description: string;
  variant: "default" | "azure" | "amber" | "neutral";
}

/** Derives squad role from minutes and appearances (current-season context). */
export function derivePlayerStatus(
  stats: PlayerStatistic,
  sport: string = "SOCCER"
): PlayerStatus {
  const { minutesPlayed, appearances, rating } = stats;

  if (sport === "BASKETBALL") {
    if (
      appearances > 0 &&
      (appearances < BB_RATE_MIN_GAMES || minutesPlayed < BB_RATE_MIN_MINUTES)
    ) {
      return {
        label: "Small Sample",
        description: `Under ${BB_RATE_MIN_GAMES} games or ${BB_RATE_MIN_MINUTES}' — rating is provisional`,
        variant: "amber",
      };
    }
    if (minutesPlayed >= 1_000 && appearances >= 40) {
      return {
        label: "Starter",
        description: "Consistent minutes this season",
        variant: "default",
      };
    }
    if (minutesPlayed >= 500 && appearances >= 20) {
      return {
        label: "Rotation",
        description: "Regular rotation involvement",
        variant: "azure",
      };
    }
    if (
      rating >= 7.2 &&
      appearances >= BB_RATE_MIN_GAMES &&
      minutesPlayed >= BB_RATE_MIN_MINUTES
    ) {
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

  if (sport === "AMERICAN_FOOTBALL") {
    if (
      appearances > 0 &&
      (appearances < AF_RATE_MIN_GAMES || minutesPlayed < AF_RATE_MIN_MINUTES)
    ) {
      return {
        label: "Small Sample",
        description: `Under ${AF_RATE_MIN_GAMES} games or ${AF_RATE_MIN_MINUTES}' proxy — rating is provisional`,
        variant: "amber",
      };
    }
    if (appearances >= 12 && minutesPlayed >= AF_RATE_MIN_MINUTES * 2) {
      return {
        label: "Starter",
        description: "Consistent snaps this season",
        variant: "default",
      };
    }
    if (appearances >= 6 && minutesPlayed >= AF_RATE_MIN_MINUTES) {
      return {
        label: "Rotation",
        description: "Regular game involvement",
        variant: "azure",
      };
    }
    if (
      rating >= 7.2 &&
      appearances >= AF_RATE_MIN_GAMES &&
      minutesPlayed >= AF_RATE_MIN_MINUTES
    ) {
      return {
        label: "Prospect",
        description: "Strong rating on a reliable sample",
        variant: "amber",
      };
    }
    return {
      label: "Squad Player",
      description: "Limited snaps this season",
      variant: "neutral",
    };
  }

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
