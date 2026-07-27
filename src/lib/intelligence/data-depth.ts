import type { Sport } from "@/lib/sport";
import type { Player, PlayerStatistic } from "@/types";

export interface SeasonProductivityFloor {
  minAppearances: number;
  minMinutes: number;
}

export interface DataDepthSnapshot {
  historySeasons: number;
  productiveSeasons: number;
  hasCurrentSignal: boolean;
  trajectoryEligible: boolean;
  gapKind: "none" | "no_history" | "stub_only" | "single_season";
  label: string;
  description: string;
  variant: "amber" | "neutral";
}

export function seasonProductivityFloor(sport: Sport): SeasonProductivityFloor {
  if (sport === "BASKETBALL") return { minAppearances: 8, minMinutes: 150 };
  if (sport === "AMERICAN_FOOTBALL") return { minAppearances: 4, minMinutes: 200 };
  return { minAppearances: 4, minMinutes: 270 };
}

export function isProductiveSeasonRow(
  appearances: number,
  minutesPlayed: number,
  sport: Sport
): boolean {
  const floor = seasonProductivityFloor(sport);
  return appearances >= floor.minAppearances && minutesPlayed >= floor.minMinutes;
}

export function isProductiveSeason(
  stats: PlayerStatistic,
  sport: Sport
): boolean {
  return isProductiveSeasonRow(stats.appearances, stats.minutesPlayed, sport);
}

export function countProductiveSeasons(
  history: PlayerStatistic[],
  sport: Sport
): number {
  const bySeason = new Map<string, PlayerStatistic[]>();
  for (const row of history) {
    const bucket = bySeason.get(row.season) ?? [];
    bucket.push(row);
    bySeason.set(row.season, bucket);
  }

  let count = 0;
  for (const rows of bySeason.values()) {
    const appearances = rows.reduce((sum, row) => sum + row.appearances, 0);
    const minutes = rows.reduce((sum, row) => sum + row.minutesPlayed, 0);
    if (isProductiveSeasonRow(appearances, minutes, sport)) {
      count += 1;
    }
  }
  return count;
}

function hasStatSignal(stats: PlayerStatistic, sport: Sport): boolean {
  if (stats.appearances <= 0 && stats.minutesPlayed <= 0) return false;
  if (sport === "BASKETBALL") {
    return (stats.points ?? 0) > 0 || stats.assists > 0 || (stats.rebounds ?? 0) > 0;
  }
  if (sport === "AMERICAN_FOOTBALL") {
    return (
      (stats.totalYards ?? 0) > 0 ||
      (stats.passingYards ?? 0) > 0 ||
      (stats.rushingYards ?? 0) > 0 ||
      (stats.receivingYards ?? 0) > 0 ||
      (stats.touchdowns ?? 0) > 0 ||
      (stats.sacks ?? 0) > 0 ||
      stats.tacklesWon > 0
    );
  }
  return stats.goals > 0 || stats.assists > 0 || stats.minutesPlayed > 0;
}

/** Honest depth snapshot for badges / limitations — does not invent trajectory. */
export function deriveDataDepthSnapshot(player: Player): DataDepthSnapshot {
  const sport = (player.sport ?? "SOCCER") as Sport;
  const history = player.history ?? [];
  const historySeasons = new Set(history.map((row) => row.season)).size;
  const productiveSeasons = countProductiveSeasons(history, sport);
  const hasCurrentSignal = hasStatSignal(player.currentSeasonStats, sport);
  const trajectoryEligible = productiveSeasons >= 2;

  let gapKind: DataDepthSnapshot["gapKind"] = "none";
  if (historySeasons === 0 || (!hasCurrentSignal && productiveSeasons === 0)) {
    gapKind = "no_history";
  } else if (productiveSeasons === 0) {
    gapKind = "stub_only";
  } else if (productiveSeasons === 1) {
    gapKind = "single_season";
  }

  if (gapKind === "no_history") {
    return {
      historySeasons,
      productiveSeasons,
      hasCurrentSignal,
      trajectoryEligible,
      gapKind,
      label: "Data gap",
      description: "No productive season lines yet — roster may exist without stats backfill.",
      variant: "amber",
    };
  }

  if (gapKind === "stub_only") {
    return {
      historySeasons,
      productiveSeasons,
      hasCurrentSignal,
      trajectoryEligible,
      gapKind,
      label: "Data gap",
      description: "Season stubs only — rates and trajectory stay provisional until backfill.",
      variant: "amber",
    };
  }

  if (gapKind === "single_season") {
    return {
      historySeasons,
      productiveSeasons,
      hasCurrentSignal,
      trajectoryEligible,
      gapKind,
      label: "1 season depth",
      description: "Only one productive season — trajectory cannot be scored yet.",
      variant: "amber",
    };
  }

  return {
    historySeasons,
    productiveSeasons,
    hasCurrentSignal,
    trajectoryEligible,
    gapKind,
    label: `${productiveSeasons} seasons`,
    description: "Enough productive seasons for trajectory heuristics.",
    variant: "neutral",
  };
}

export function dataDepthLimitationLines(player: Player): string[] {
  const depth = deriveDataDepthSnapshot(player);
  if (depth.gapKind === "none") return [];
  return [`${depth.label}: ${depth.description}`];
}
