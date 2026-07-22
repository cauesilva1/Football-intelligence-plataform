/**
 * Single source of truth for American football player ratings.
 *
 * Season production is stored as season totals (yards/TDs) with matchesPlayed
 * as games; minutes are a proxy (games × 60). Sample floors prevent tiny
 * samples from printing 9.5.
 */
import { AF_RATE_MIN_GAMES, AF_RATE_MIN_MINUTES } from "@/lib/scoring";

export type FootballRatingStat = {
  matchesPlayed: number;
  minutesPlayed: number;
  totalYards: number;
  touchdowns: number;
  tackles: number;
  sacks: number;
  passingYards?: number;
  rushingYards?: number;
  receivingYards?: number;
};

export type FootballPositionGroup = "QB" | "SKILL" | "OL" | "DEFENSE" | "SPECIALIST";

export function footballPositionGroup(position: string): FootballPositionGroup {
  const p = position.toUpperCase();
  if (p === "QB") return "QB";
  if (["WR", "TE", "RB", "FB", "HB"].includes(p)) return "SKILL";
  if (["OT", "OG", "C", "OL", "G", "T"].includes(p)) return "OL";
  if (["K", "P", "LS", "PK"].includes(p)) return "SPECIALIST";
  return "DEFENSE";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hasReliableFootballSample(stat: {
  matchesPlayed: number;
  minutesPlayed: number;
}): boolean {
  return (
    stat.matchesPlayed >= AF_RATE_MIN_GAMES &&
    stat.minutesPlayed >= AF_RATE_MIN_MINUTES
  );
}

export function footballRatingSmallSample(stat: FootballRatingStat): number {
  const games = Math.max(stat.matchesPlayed, 1);
  const yardsPerGame = stat.totalYards / games;
  const limited =
    6 +
    Math.min(yardsPerGame, 200) * 0.003 +
    Math.min(stat.touchdowns / games, 2) * 0.25;
  const samplePenalty = stat.matchesPlayed < 3 ? 0.4 : 0.2;
  return Number(clamp(limited - samplePenalty, 5, 7).toFixed(2));
}

/**
 * Canonical productivity formula (methodology / docs), role-tilted:
 *   QB leans yards/TDs; skill similar; defense leans tackles/sacks.
 */
export function footballRatingFromAverages(
  stat: FootballRatingStat,
  position = "WR"
): number {
  const games = Math.max(stat.matchesPlayed, 1);
  const yardsPerGame = stat.totalYards / games;
  const tdPerGame = stat.touchdowns / games;
  const tacklesPerGame = stat.tackles / games;
  const sacksPerGame = stat.sacks / games;
  const group = footballPositionGroup(position);

  let rating = 6;
  if (group === "QB") {
    rating += Math.min(yardsPerGame, 350) * 0.005;
    rating += Math.min(tdPerGame, 4) * 0.4;
    rating += Math.min(sacksPerGame, 1) * -0.15;
  } else if (group === "SKILL") {
    rating += Math.min(yardsPerGame, 150) * 0.008;
    rating += Math.min(tdPerGame, 2) * 0.45;
    rating += Math.min(tacklesPerGame, 2) * 0.05;
  } else if (group === "DEFENSE") {
    rating += Math.min(tacklesPerGame, 12) * 0.12;
    rating += Math.min(sacksPerGame, 2) * 0.55;
    rating += Math.min(tdPerGame, 1) * 0.3;
    rating += Math.min(yardsPerGame, 40) * 0.002;
  } else if (group === "SPECIALIST") {
    rating += Math.min(tdPerGame, 3) * 0.35;
    rating += Math.min(yardsPerGame, 80) * 0.004;
  } else {
    // OL — limited counting stats; stay near baseline with game participation.
    rating += Math.min(stat.matchesPlayed, 17) * 0.04;
  }

  return Number(clamp(rating, 5, 10).toFixed(2));
}

export function computeFootballRating(
  stat: FootballRatingStat,
  position = "WR"
): number {
  if (!hasReliableFootballSample(stat)) {
    return footballRatingSmallSample(stat);
  }
  return footballRatingFromAverages(stat, position);
}

export function reliableFootballRating(
  stat: FootballRatingStat & { rating: number },
  position = "WR"
): number {
  if (!hasReliableFootballSample(stat)) {
    return footballRatingSmallSample(stat);
  }
  const fromAverages = footballRatingFromAverages(stat, position);
  if (stat.rating >= 8.5 && fromAverages < 7.5) {
    return fromAverages;
  }
  return Number(stat.rating.toFixed(2));
}

/** Single-game productivity proxy (Sofascore-inspired baseline ~6.5). */
export function computeFootballMatchRating(stat: {
  minutesPlayed: number;
  totalYards: number;
  touchdowns: number;
  tackles: number;
  sacks: number;
  interceptions?: number;
}): number | null {
  if (stat.minutesPlayed <= 0) return null;

  let rating = 6.5;
  rating += Math.min(stat.totalYards, 400) * 0.004;
  rating += Math.min(stat.touchdowns, 5) * 0.35;
  rating += Math.min(stat.tackles, 15) * 0.06;
  rating += Math.min(stat.sacks, 4) * 0.28;
  rating += Math.min(stat.interceptions ?? 0, 3) * 0.25;

  if (stat.minutesPlayed < 30) {
    rating = 6.5 + (rating - 6.5) * 0.5;
  }

  return Number(clamp(rating, 5, 10).toFixed(2));
}
