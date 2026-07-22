import { toRadarProfile } from "@/lib/normalize";
import type { Player } from "@/types";

export interface PlayingStyle {
  label: string;
  description: string;
  traits: string[];
}

const SOCCER_STYLE_BY_DIMENSION: Record<string, { label: string; description: string }> = {
  Finishing: {
    label: "Finisher",
    description: "Shot volume and chance conversion above the positional average.",
  },
  Creation: {
    label: "Creator",
    description: "Active in the final third and chance generation.",
  },
  Passing: {
    label: "Builder",
    description: "Safe distribution and possession progression with vertical passes.",
  },
  Dribbling: {
    label: "Ball Carrier",
    description: "One-on-one dribbling and ability to break defensive lines.",
  },
  Defense: {
    label: "Ball Winner",
    description: "Anticipation, tackles, and consistent defensive cover.",
  },
  Physical: {
    label: "Physical Dominator",
    description: "Advantage in physical duels and second-ball contests.",
  },
};

const BASKETBALL_STYLE_BY_DIMENSION: Record<string, { label: string; description: string }> = {
  Scoring: {
    label: "Scorer",
    description: "Creates and converts offense at a high per-game rate.",
  },
  Rebounding: {
    label: "Board Hunter",
    description: "Controls the glass and starts second-chance offense.",
  },
  Playmaking: {
    label: "Floor General",
    description: "Creates for teammates and sustains half-court flow.",
  },
  Defense: {
    label: "Two-Way Disruptor",
    description: "Steals and blocks that swing possessions.",
  },
  "FG%": {
    label: "Efficient Finisher",
    description: "Converts looks cleanly inside the arc.",
  },
  "3P%": {
    label: "Spacer",
    description: "Threatens defenses with reliable perimeter shooting.",
  },
};

function deriveSoccerPlayingStyle(player: Player): PlayingStyle {
  const profile = toRadarProfile(player.currentSeasonStats);
  const ranked = Object.entries(profile).sort(([, a], [, b]) => b - a);
  const [topKey, topValue] = ranked[0];
  const [secondKey] = ranked[1];

  const primary = SOCCER_STYLE_BY_DIMENSION[topKey];
  const secondary = SOCCER_STYLE_BY_DIMENSION[secondKey];

  const traits = [
    `${topKey} (${Math.round(topValue)}/100)`,
    `${secondKey} (${Math.round(profile[secondKey])}/100)`,
    player.preferredFoot === "BOTH"
      ? "Two-footed"
      : `${player.preferredFoot === "LEFT" ? "Left" : "Right"} foot`,
  ];

  if (player.position === "GK") {
    return {
      label: "Shot Stopper",
      description: "Profile oriented to reflexes, game reading, and defensive organization.",
      traits: ["Aerial play", "Shot stopping", "Distribution"],
    };
  }

  return {
    label: primary?.label ?? "Hybrid Profile",
    description: `${primary?.description ?? ""} Complemented by a ${
      secondary?.label.toLowerCase() ?? "balanced"
    } tendency.`,
    traits,
  };
}

function deriveBasketballPlayingStyle(player: Player): PlayingStyle {
  const profile = toRadarProfile(player.currentSeasonStats);
  const ranked = Object.entries(profile).sort(([, a], [, b]) => b - a);
  const [topKey, topValue] = ranked[0] ?? ["Scoring", 50];
  const [secondKey] = ranked[1] ?? ["Playmaking", 40];

  const primary = BASKETBALL_STYLE_BY_DIMENSION[topKey];
  const secondary = BASKETBALL_STYLE_BY_DIMENSION[secondKey];

  return {
    label: primary?.label ?? "Two-Way Hybrid",
    description: `${primary?.description ?? "Balanced production."} Complemented by a ${
      secondary?.label.toLowerCase() ?? "balanced"
    } tendency.`,
    traits: [
      `${topKey} (${Math.round(Number(topValue))}/100)`,
      `${secondKey} (${Math.round(profile[secondKey] ?? 0)}/100)`,
      player.position,
    ],
  };
}

/** Product-facing playing style derived from normalized radar dimensions. */
export function derivePlayingStyle(player: Player): PlayingStyle {
  if ((player.sport ?? "SOCCER") === "BASKETBALL") {
    return deriveBasketballPlayingStyle(player);
  }
  return deriveSoccerPlayingStyle(player);
}
