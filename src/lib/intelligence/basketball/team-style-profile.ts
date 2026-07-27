import type { TeamStatistic } from "@/types";

export type BasketballTeamStyleArchetype =
  | "pace_space"
  | "defensive"
  | "balanced"
  | "grind";

export interface BasketballTeamStyleProfile {
  teamId: string;
  season: string;
  archetype: BasketballTeamStyleArchetype;
  label: string;
  offenseIndex: number;
  defenseIndex: number;
  winPct: number;
  traits: string[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Basketball team style from season TeamStatistic.
 * Uses attack/defense ratings when present; otherwise PPG / opp PPG proxies
 * (goalsFor/Against often store points for BB standings feeds).
 */
export function buildBasketballTeamStyleProfile(
  stats: TeamStatistic
): BasketballTeamStyleProfile {
  const games = Math.max(stats.matchesPlayed, 1);
  const ppg = stats.goalsFor / games;
  const oppg = stats.goalsAgainst / games;
  const winPct = stats.wins / games;

  const offenseIndex =
    stats.attackRating > 0
      ? clamp(stats.attackRating)
      : clamp((ppg / 118) * 100);
  const defenseIndex =
    stats.defenseRating > 0
      ? clamp(stats.defenseRating)
      : clamp(100 - (oppg / 118) * 100);

  let archetype: BasketballTeamStyleArchetype = "balanced";
  let label = "Balanced attack/defense";

  if (offenseIndex >= 65 && defenseIndex >= 55) {
    archetype = "pace_space";
    label = "Pace & space offense";
  } else if (defenseIndex >= 65 && offenseIndex < 55) {
    archetype = "defensive";
    label = "Defense-first";
  } else if (offenseIndex < 48 && defenseIndex < 48) {
    archetype = "grind";
    label = "Grind-it-out";
  } else if (offenseIndex >= 62) {
    archetype = "pace_space";
    label = "Offense-leaning";
  } else if (defenseIndex >= 60) {
    archetype = "defensive";
    label = "Defense-leaning";
  }

  return {
    teamId: stats.teamId,
    season: stats.season,
    archetype,
    label,
    offenseIndex,
    defenseIndex,
    winPct,
    traits: [
      `Win% ${Math.round(winPct * 100)}%`,
      `Offense ${Math.round(offenseIndex)}/100`,
      `Defense ${Math.round(defenseIndex)}/100`,
      `PF/PA ${ppg.toFixed(1)}/${oppg.toFixed(1)}`,
    ],
  };
}
