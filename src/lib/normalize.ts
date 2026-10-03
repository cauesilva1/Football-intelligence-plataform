import type { PlayerStatistic } from "@/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

/**
 * The light file stores crosses in `keyPasses` (`Crs`).
 * A per-90 above 15 is a season total that leaked into the rate.
 */
export function soccerCrossesPer90(stat: Pick<PlayerStatistic, "per90" | "keyPasses" | "minutesPlayed">): number {
  const rate = stat.per90.keyPasses;
  if (!Number.isFinite(rate) || rate < 0) return 0;
  if (rate <= 15) return rate;
  if (stat.minutesPlayed > 0 && Number.isFinite(stat.keyPasses)) {
    return Math.max(0, (stat.keyPasses / stat.minutesPlayed) * 90);
  }
  return 15;
}

/** 0–100 share of a rate, capped at twice the benchmark so one input cannot leave the scale. */
function rateShare(rate: number, benchmark: number): number {
  if (!Number.isFinite(rate) || rate <= 0 || benchmark <= 0) return 0;
  return (Math.min(rate, benchmark * 2) / benchmark) * 100;
}

const ASSISTS_PER90_BENCHMARK = 0.45;
/** Elite cross volume in the light file, not an elite key-pass rate. */
const CROSSES_PER90_BENCHMARK = 8;

/** Equal-weight creativity index for the comparison bars. */
export function soccerCreativityIndex(stat: PlayerStatistic): number {
  return clamp(
    rateShare(stat.per90.assists, ASSISTS_PER90_BENCHMARK) * 0.5 +
      rateShare(soccerCrossesPer90(stat), CROSSES_PER90_BENCHMARK) * 0.5
  );
}

/** Assist-weighted creation index for the radar. */
export function soccerCreationIndex(stat: PlayerStatistic): number {
  return clamp(
    rateShare(stat.per90.assists, ASSISTS_PER90_BENCHMARK) * 0.6 +
      rateShare(soccerCrossesPer90(stat), CROSSES_PER90_BENCHMARK) * 0.4
  );
}

/** Radar profile uses per-90 (futebol), per-game (basquete) ou produção AF. */
export function toRadarProfile(stat: PlayerStatistic): Record<string, number> {
  if (stat.sport === "BASKETBALL" && stat.perGame) {
    const g = stat.perGame;
    return {
      Scoring: clamp((g.points / 30) * 100),
      Rebounding: clamp((g.rebounds / 12) * 100),
      Playmaking: clamp((g.assists / 10) * 100),
      Defense: clamp((g.steals / 2.5) * 100 * 0.5 + (g.blocks / 2.5) * 100 * 0.5),
      "FG%": clamp(stat.fieldGoalsPercent ?? 0),
      "3P%": clamp(stat.threePointsPercent ?? 0),
    };
  }

  if (stat.sport === "AMERICAN_FOOTBALL") {
    const games = Math.max(stat.appearances, 1);
    return {
      Passing: clamp(((stat.passingYards ?? 0) / games / 250) * 100),
      Rushing: clamp(((stat.rushingYards ?? 0) / games / 60) * 100),
      Receiving: clamp(((stat.receivingYards ?? 0) / games / 70) * 100),
      Defense: clamp(((stat.interceptions ?? 0) / games / 0.3) * 100),
      Tackles: clamp(((stat.tacklesWon ?? 0) / games / 7) * 100),
      Sacks: clamp(((stat.sacks ?? 0) / games / 0.7) * 100),
    };
  }

  const p = stat.per90;
  return {
    Finishing: clamp((p.goals / 0.65) * 100),
    Creation: soccerCreationIndex(stat),
    Passing: clamp(stat.passAccuracy),
    Dribbling: clamp((p.dribbles / 4) * 100),
    Defense: clamp((p.tackles / 3.5) * 100 * 0.5 + (p.interceptions / 2.5) * 100 * 0.5),
    Physical: clamp(stat.duelsWonPct),
  };
}
