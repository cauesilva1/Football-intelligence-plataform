import type { TeamStatistic } from "@/types";

export type TeamStyleArchetype =
  | "possession"
  | "direct"
  | "high_press"
  | "low_block"
  | "balanced";

export interface TeamStyleProfile {
  teamId: string;
  season: string;
  archetype: TeamStyleArchetype;
  label: string;
  possessionPct: number;
  pressIndex: number;
  attackIndex: number;
  defenseIndex: number;
  traits: string[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Team playing style proxy from season TeamStatistic — rule-based, no tracking feed. */
export function buildTeamStyleProfile(stats: TeamStatistic): TeamStyleProfile {
  const possessionPct = stats.possessionPct;
  const pressIndex = clamp(stats.pressuresPer90 * 8);
  const attackIndex = clamp(stats.attackRating);
  const defenseIndex = clamp(stats.defenseRating);

  let archetype: TeamStyleArchetype = "balanced";
  let label = "Balanced block";

  if (possessionPct >= 54 && pressIndex >= 55) {
    archetype = "possession";
    label = "Possession + high press";
  } else if (possessionPct >= 54) {
    archetype = "possession";
    label = "Possession-oriented";
  } else if (pressIndex >= 60) {
    archetype = "high_press";
    label = "High press";
  } else if (defenseIndex >= 65 && possessionPct < 48) {
    archetype = "low_block";
    label = "Low block / compact";
  } else if (attackIndex >= 65 && possessionPct < 50) {
    archetype = "direct";
    label = "Direct attacking";
  }

  const traits = [
    `Possession ${Math.round(possessionPct)}%`,
    `Press index ${Math.round(pressIndex)}/100`,
    `Attack ${Math.round(attackIndex)}/100`,
    `Defense ${Math.round(defenseIndex)}/100`,
  ];

  return {
    teamId: stats.teamId,
    season: stats.season,
    archetype,
    label,
    possessionPct,
    pressIndex,
    attackIndex,
    defenseIndex,
    traits,
  };
}
