import type { Foot } from "@/types";

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

/**
 * Rating Proxy — nota sintética derivada apenas de estatísticas reais.
 *
 * Fórmula:
 *   rating = 6.0
 *          + (gols/90) × 1.25
 *          + (assistências/90) × 0.95
 *          + [DF/MF] (tacklesWon/90) × 0.38 + (interceptions/90) × 0.28
 *          − cartões vermelhos × 0.45
 *          − cartões amarelos × 0.04
 *          − penalidade de amostra (minutos < 450)
 *   resultado clamped em [4.0, 9.5]
 */
export function computeRatingProxy(
  stat: EnrichableStatistic,
  position: string
): number {
  const g90 = per90(stat.goals, stat.minutesPlayed);
  const a90 = per90(stat.assists, stat.minutesPlayed);
  const tkl90 = per90(stat.tacklesWon, stat.minutesPlayed);
  const int90 = per90(stat.interceptions, stat.minutesPlayed);

  let rating = 6.0;

  rating += g90 * 1.25;
  rating += a90 * 0.95;

  if (DEFENSIVE_BONUS_POSITIONS.has(position)) {
    rating += tkl90 * 0.38;
    rating += int90 * 0.28;
  }

  rating -= stat.redCards * 0.45;
  rating -= stat.yellowCards * 0.04;

  if (stat.minutesPlayed < 180) rating -= 0.35;
  else if (stat.minutesPlayed < 450) rating -= 0.15;

  return Number(clamp(rating, 4.0, 9.5).toFixed(2));
}

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

  if (stat.goals >= 5) strengths.push("Finalização Precisa");
  if (stat.assists >= 4) strengths.push("Visão de Jogo");
  if (stat.tacklesWon >= 15) {
    strengths.push(DEFENSIVE_BONUS_POSITIONS.has(position) ? "Desarmes Precisos" : "Combate Físico");
  }
  if (stat.interceptions >= 12) strengths.push("Antecipação Defensiva");
  if (stat.minutesPlayed >= 2_000) strengths.push("Regularidade Titular");
  if (per90(stat.goals, stat.minutesPlayed) >= 0.45) strengths.push("Ameaça Constante no Ataque");
  if (per90(stat.assists, stat.minutesPlayed) >= 0.2) strengths.push("Criação de Chances");

  if (
    FORWARD_POSITIONS.has(position) &&
    stat.minutesPlayed > 1_500 &&
    stat.goals === 0 &&
    stat.assists === 0
  ) {
    weaknesses.push("Produtividade Ofensiva");
  }
  if (stat.minutesPlayed >= 900 && stat.goals + stat.assists < 2 && !FORWARD_POSITIONS.has(position)) {
    weaknesses.push("Contribuição Ofensiva Limitada");
  }
  if (stat.redCards >= 1) weaknesses.push("Disciplina em Campo");
  if (stat.minutesPlayed < 450) weaknesses.push("Amostra Reduzida na Temporada");
  if (stat.yellowCards >= 8) weaknesses.push("Risco de Suspensão");

  if (strengths.length === 0 && stat.minutesPlayed >= 600) {
    strengths.push("Participação Consistente");
  }
  if (weaknesses.length === 0 && stat.minutesPlayed < 900) {
    weaknesses.push("Minutos Limitados");
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
