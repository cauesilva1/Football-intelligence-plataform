import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import { COMPARISON_CATEGORIES, toComparisonProfile } from "@/features/comparison/lib/categories";
import type { Player } from "@/types";

export interface ComparisonReport {
  summary: string;
  advantagesA: string[];
  advantagesB: string[];
  insights: string[];
  categoryWinsA: string[];
  categoryWinsB: string[];
  recommendation: string;
}

function categoryAdvantageLabel(category: string, playerName: string, margin: number): string {
  return `${category}: ${playerName} (+${margin} pts no índice)`;
}

export function buildComparisonReport(a: Player, b: Player): ComparisonReport {
  const sa = a.currentSeasonStats;
  const sb = b.currentSeasonStats;
  const profileA = toComparisonProfile(sa);
  const profileB = toComparisonProfile(sb);

  const advantagesA: string[] = [];
  const advantagesB: string[] = [];
  const categoryWinsA: string[] = [];
  const categoryWinsB: string[] = [];
  const insights: string[] = [];

  for (const category of COMPARISON_CATEGORIES) {
    const diff = profileA[category] - profileB[category];
    if (Math.abs(diff) < 3) continue;

    if (diff > 0) {
      categoryWinsA.push(category);
      advantagesA.push(categoryAdvantageLabel(category, a.knownAs, Math.round(diff)));
    } else {
      categoryWinsB.push(category);
      advantagesB.push(categoryAdvantageLabel(category, b.knownAs, Math.round(Math.abs(diff))));
    }
  }

  if (sa.per90.goals !== sb.per90.goals) {
    const better = sa.per90.goals > sb.per90.goals ? a : b;
    const diff = Math.abs(sa.per90.goals - sb.per90.goals).toFixed(2);
    insights.push(
      `${better.knownAs} produz ${diff} gol(s) a mais por 90 minutos na temporada atual.`
    );
  }

  if (sa.per90.assists !== sb.per90.assists) {
    const better = sa.per90.assists > sb.per90.assists ? a : b;
    insights.push(`${better.knownAs} lidera em assistências por 90.`);
  }

  const xgA = computeXGPer90(sa.minutesPlayed, sa.xG);
  const xgB = computeXGPer90(sb.minutesPlayed, sb.xG);
  if (Math.abs(xgA - xgB) >= 0.08) {
    const better = xgA > xgB ? a : b;
    insights.push(`${better.knownAs} gera mais xG por 90 (${Math.max(xgA, xgB).toFixed(2)}).`);
  }

  if (Math.abs(sa.passAccuracy - sb.passAccuracy) > 2) {
    const better = sa.passAccuracy > sb.passAccuracy ? a : b;
    insights.push(`${better.knownAs} apresenta passe mais preciso (${better.currentSeasonStats.passAccuracy.toFixed(0)}%).`);
  }

  if (Math.abs(a.age - b.age) >= 3) {
    const younger = a.age < b.age ? a : b;
    insights.push(`${younger.knownAs} é mais jovem — maior horizonte de valorização.`);
  }

  const ratingDiff = sa.rating - sb.rating;
  let recommendation: string;
  if (Math.abs(ratingDiff) < 0.15 && categoryWinsA.length === categoryWinsB.length) {
    recommendation =
      "Perfis muito equilibrados. A decisão deve priorizar encaixe tático e custo-benefício no contexto do clube.";
  } else if (ratingDiff > 0.15 || categoryWinsA.length > categoryWinsB.length) {
    recommendation = `${a.knownAs} apresenta vantagem agregada para scouting imediato, com ${categoryWinsA.length} dimensão(ões) superior(es).`;
  } else {
    recommendation = `${b.knownAs} apresenta vantagem agregada para scouting imediato, com ${categoryWinsB.length} dimensão(ões) superior(es).`;
  }

  const categoryLeader = categoryWinsA.length >= categoryWinsB.length ? a : b;
  const categoryWinCount = Math.max(categoryWinsA.length, categoryWinsB.length);
  const summary = `Comparando ${a.knownAs} (${sa.rating.toFixed(1)}) e ${b.knownAs} (${sb.rating.toFixed(1)}). ${categoryLeader.knownAs} lidera em ${categoryWinCount} de ${COMPARISON_CATEGORIES.length} categorias técnicas.`;

  if (advantagesA.length === 0) {
    advantagesA.push("Sem vantagem clara em categorias isoladas — desempenho próximo da média do adversário.");
  }
  if (advantagesB.length === 0) {
    advantagesB.push("Sem vantagem clara em categorias isoladas — desempenho próximo da média do adversário.");
  }

  return {
    summary,
    advantagesA,
    advantagesB,
    insights,
    categoryWinsA,
    categoryWinsB,
    recommendation,
  };
}

/** @deprecated Use buildComparisonReport */
export function buildComparisonAnalysis(a: Player, b: Player): string[] {
  return buildComparisonReport(a, b).insights;
}
