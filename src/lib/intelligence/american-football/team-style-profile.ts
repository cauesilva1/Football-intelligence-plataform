import type { TeamStatistic } from "@/types";

export type AmericanFootballTeamStyleArchetype =
  | "explosive_offense"
  | "stout_defense"
  | "balanced"
  | "grind";

export interface AmericanFootballTeamStyleProfile {
  teamId: string;
  season: string;
  archetype: AmericanFootballTeamStyleArchetype;
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
 * AF team style from season TeamStatistic.
 * Scheme (pass/run) is not in the feed — use points for/against and W-L proxies.
 */
export function buildAmericanFootballTeamStyleProfile(
  stats: TeamStatistic
): AmericanFootballTeamStyleProfile {
  const games = Math.max(stats.matchesPlayed, 1);
  const ppg = stats.goalsFor / games;
  const oppg = stats.goalsAgainst / games;
  const winPct = stats.wins / games;

  const offenseIndex =
    stats.attackRating > 0
      ? clamp(stats.attackRating)
      : clamp((ppg / 28) * 100);
  const defenseIndex =
    stats.defenseRating > 0
      ? clamp(stats.defenseRating)
      : clamp(100 - (oppg / 28) * 100);

  let archetype: AmericanFootballTeamStyleArchetype = "balanced";
  let label = "Balanced unit";

  if (offenseIndex >= 65 && defenseIndex >= 55) {
    archetype = "explosive_offense";
    label = "Explosive offense";
  } else if (defenseIndex >= 65 && offenseIndex < 55) {
    archetype = "stout_defense";
    label = "Stout defense";
  } else if (offenseIndex < 48 && defenseIndex < 48) {
    archetype = "grind";
    label = "Field-position grind";
  } else if (offenseIndex >= 62) {
    archetype = "explosive_offense";
    label = "Offense-leaning";
  } else if (defenseIndex >= 60) {
    archetype = "stout_defense";
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
