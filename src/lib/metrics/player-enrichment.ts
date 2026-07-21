import type { Foot } from "@/types";
import { computeRatingProxy } from "@/lib/scoring/soccer-rating";

export interface EnrichableStatistic {
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  tacklesWon: number;
  interceptions: number;
  yellowCards: number;
  redCards: number;
}

export interface EnrichablePlayer {
  id: string;
  position: string;
  age: number;
}

const DEFENSIVE_BONUS_POSITIONS = new Set(["GK", "CB", "LB", "RB", "CDM", "CM"]);
const FORWARD_POSITIONS = new Set(["LW", "RW", "ST", "CAM"]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function per90(total: number, minutesPlayed: number): number {
  if (minutesPlayed <= 0) return 0;
  return (total / minutesPlayed) * 90;
}

export { computeRatingProxy };

/** xG estimado (totais da temporada) — proxy para UI e radar. */
export function estimateXG(stat: Pick<EnrichableStatistic, "goals" | "shotsOnTarget">): number {
  return Number((stat.goals * 0.85 + stat.shotsOnTarget * 0.1).toFixed(2));
}

/** xA estimado (totais da temporada) — proxy baseado em assistências e volume. */
export function estimateXA(stat: Pick<EnrichableStatistic, "assists" | "minutesPlayed">): number {
  const volume = stat.minutesPlayed > 0 ? stat.minutesPlayed / 90 : 0;
  return Number((stat.assists * 0.88 + volume * 0.06).toFixed(2));
}

/** Proxies leves para dimensões do radar ausentes no CSV light. */
export function estimateRadarSupport(stat: EnrichableStatistic): {
  keyPasses: number;
  passAccuracy: number;
  dribblesCompleted: number;
  duelsWonPct: number;
} {
  const volume = stat.minutesPlayed > 0 ? stat.minutesPlayed / 90 : 0;

  return {
    keyPasses: Number((stat.assists * 1.15 + stat.goals * 0.25).toFixed(2)),
    passAccuracy: Number(clamp(68 + stat.assists * 1.8 + volume * 0.4, 55, 92).toFixed(1)),
    dribblesCompleted: Number((stat.shots * 0.12 + stat.assists * 0.35).toFixed(2)),
    duelsWonPct: Number(
      clamp(45 + per90(stat.tacklesWon, stat.minutesPlayed) * 4.5, 35, 72).toFixed(1)
    ),
  };
}

export function deriveStrengthsWeaknesses(
  stat: EnrichableStatistic,
  position: string
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (stat.goals >= 5) strengths.push("Clinical Finishing");
  if (stat.assists >= 4) strengths.push("Vision");
  if (stat.tacklesWon >= 15) {
    strengths.push(DEFENSIVE_BONUS_POSITIONS.has(position) ? "Precise Tackling" : "Physical Duels");
  } else if (
    DEFENSIVE_BONUS_POSITIONS.has(position) &&
    stat.tacklesWon >= 5 &&
    stat.minutesPlayed >= 180
  ) {
    strengths.push("Active Defending");
  }
  if (stat.interceptions >= 12) strengths.push("Defensive Anticipation");
  else if (
    DEFENSIVE_BONUS_POSITIONS.has(position) &&
    stat.interceptions >= 5 &&
    stat.minutesPlayed >= 180
  ) {
    strengths.push("Reading the Game");
  }
  if (stat.minutesPlayed >= 2_000) strengths.push("Starter Consistency");
  else if (stat.minutesPlayed >= 300 && stat.minutesPlayed < 450) {
    strengths.push("Emerging Minutes");
  }
  if (per90(stat.goals, stat.minutesPlayed) >= 0.45) strengths.push("Constant Attacking Threat");
  if (per90(stat.assists, stat.minutesPlayed) >= 0.2) strengths.push("Chance Creation");

  if (
    FORWARD_POSITIONS.has(position) &&
    stat.minutesPlayed > 1_500 &&
    stat.goals === 0 &&
    stat.assists === 0
  ) {
    weaknesses.push("Offensive Output");
  }
  if (stat.minutesPlayed >= 900 && stat.goals + stat.assists < 2 && !FORWARD_POSITIONS.has(position)) {
    weaknesses.push("Limited Offensive Contribution");
  }
  if (stat.redCards >= 1) weaknesses.push("On-Pitch Discipline");
  if (stat.minutesPlayed < 450) weaknesses.push("Small Sample Size This Season");
  if (stat.yellowCards >= 8) weaknesses.push("Suspension Risk");

  if (strengths.length === 0 && stat.minutesPlayed >= 600) {
    strengths.push("Consistent Involvement");
  }
  if (weaknesses.length === 0 && stat.minutesPlayed < 900) {
    weaknesses.push("Limited Minutes Played");
  }

  return {
    strengths: [...new Set(strengths)].slice(0, 5),
    weaknesses: [...new Set(weaknesses)].slice(0, 4),
  };
}

/** Valor estimado (€) — rating proxy + perfil etário para Hidden Gems. */
export function estimateMarketValue(rating: number, age: number): number {
  const base = Math.max(250_000, (rating - 5.2) ** 2 * 380_000);

  let ageMultiplier = 1;
  if (age <= 21) ageMultiplier = 1.85;
  else if (age <= 23) ageMultiplier = 1.55;
  else if (age <= 26) ageMultiplier = 1.25;
  else if (age >= 32) ageMultiplier = 0.65;
  else if (age >= 29) ageMultiplier = 0.85;

  return Math.round(base * ageMultiplier);
}

/** Pé dominante determinístico — ~75% direito, ~25% esquerdo (reprodutível por id). */
export function derivePreferredFoot(playerId: string): Foot {
  let hash = 0;
  for (let i = 0; i < playerId.length; i += 1) {
    hash = (hash * 31 + playerId.charCodeAt(i)) % 100;
  }
  return hash < 25 ? "LEFT" : "RIGHT";
}

export interface EnrichedPlayerData {
  rating: number;
  xG: number;
  xA: number;
  keyPasses: number;
  passAccuracy: number;
  dribblesCompleted: number;
  duelsWonPct: number;
  strengths: string[];
  weaknesses: string[];
  marketValue: number;
  preferredFoot: Foot;
}

export function enrichPlayerRecord(
  player: EnrichablePlayer,
  stat: EnrichableStatistic
): EnrichedPlayerData {
  const rating = computeRatingProxy(stat, player.position);
  const radar = estimateRadarSupport(stat);
  const { strengths, weaknesses } = deriveStrengthsWeaknesses(stat, player.position);

  return {
    rating,
    xG: estimateXG(stat),
    xA: estimateXA(stat),
    ...radar,
    strengths,
    weaknesses,
    marketValue: estimateMarketValue(rating, player.age),
    preferredFoot: derivePreferredFoot(player.id),
  };
}
