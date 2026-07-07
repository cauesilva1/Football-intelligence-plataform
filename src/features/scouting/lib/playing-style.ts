import { toRadarProfile } from "@/lib/normalize";
import type { Player } from "@/types";

export interface PlayingStyle {
  label: string;
  description: string;
  traits: string[];
}

const STYLE_BY_DIMENSION: Record<string, { label: string; description: string }> = {
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

/** Product-facing playing style derived from normalized radar dimensions. */
export function derivePlayingStyle(player: Player): PlayingStyle {
  const profile = toRadarProfile(player.currentSeasonStats);
  const ranked = Object.entries(profile).sort(([, a], [, b]) => b - a);
  const [topKey, topValue] = ranked[0];
  const [secondKey] = ranked[1];

  const primary = STYLE_BY_DIMENSION[topKey];
  const secondary = STYLE_BY_DIMENSION[secondKey];

  const traits = [
    `${topKey} (${Math.round(topValue)}/100)`,
    `${secondKey} (${Math.round(profile[secondKey])}/100)`,
    player.preferredFoot === "BOTH" ? "Two-footed" : `${player.preferredFoot === "LEFT" ? "Left" : "Right"} foot`,
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
    description: `${primary?.description ?? ""} Complemented by a ${secondary?.label.toLowerCase() ?? "balanced"} tendency.`,
    traits,
  };
}
