import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import {
  comparisonCategoriesFor,
  toComparisonProfile,
} from "@/features/comparison/lib/categories";
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
  return `${category}: ${playerName} (+${margin} index pts)`;
}

function buildSoccerInsights(a: Player, b: Player): string[] {
  const sa = a.currentSeasonStats;
  const sb = b.currentSeasonStats;
  const insights: string[] = [];

  if (sa.per90.goals !== sb.per90.goals) {
    const better = sa.per90.goals > sb.per90.goals ? a : b;
    const diff = Math.abs(sa.per90.goals - sb.per90.goals).toFixed(2);
    insights.push(
      `${better.knownAs} produces ${diff} more goal(s) per 90 in the current season.`
    );
  }

  if (sa.per90.assists !== sb.per90.assists) {
    const better = sa.per90.assists > sb.per90.assists ? a : b;
    insights.push(`${better.knownAs} leads in assists per 90.`);
  }

  const xgA = computeXGPer90(sa.minutesPlayed, sa.xG);
  const xgB = computeXGPer90(sb.minutesPlayed, sb.xG);
  if (Math.abs(xgA - xgB) >= 0.08) {
    const better = xgA > xgB ? a : b;
    insights.push(
      `${better.knownAs} generates more xG per 90 (${Math.max(xgA, xgB).toFixed(2)}).`
    );
  }

  if (Math.abs(sa.passAccuracy - sb.passAccuracy) > 2) {
    const better = sa.passAccuracy > sb.passAccuracy ? a : b;
    insights.push(
      `${better.knownAs} shows higher pass accuracy (${better.currentSeasonStats.passAccuracy.toFixed(0)}%).`
    );
  }

  return insights;
}

function perGame(stat: Player["currentSeasonStats"]) {
  return {
    points: stat.perGame?.points ?? stat.points ?? 0,
    rebounds: stat.perGame?.rebounds ?? stat.rebounds ?? 0,
    assists: stat.perGame?.assists ?? stat.assists ?? 0,
    steals: stat.perGame?.steals ?? stat.steals ?? 0,
    blocks: stat.perGame?.blocks ?? stat.blocks ?? 0,
  };
}

function buildBasketballInsights(a: Player, b: Player): string[] {
  const ga = perGame(a.currentSeasonStats);
  const gb = perGame(b.currentSeasonStats);
  const insights: string[] = [];

  if (ga.points !== gb.points) {
    const better = ga.points > gb.points ? a : b;
    const diff = Math.abs(ga.points - gb.points).toFixed(1);
    insights.push(`${better.knownAs} marca ${diff} PPG a mais na temporada.`);
  }

  if (ga.rebounds !== gb.rebounds) {
    const better = ga.rebounds > gb.rebounds ? a : b;
    insights.push(`${better.knownAs} lidera em rebotes por jogo.`);
  }

  if (ga.assists !== gb.assists) {
    const better = ga.assists > gb.assists ? a : b;
    insights.push(`${better.knownAs} lidera em assistências por jogo.`);
  }

  const defA = ga.steals + ga.blocks;
  const defB = gb.steals + gb.blocks;
  if (Math.abs(defA - defB) >= 0.4) {
    const better = defA > defB ? a : b;
    insights.push(`${better.knownAs} combina mais roubos + tocos por jogo.`);
  }

  const fgA = a.currentSeasonStats.fieldGoalsPercent ?? 0;
  const fgB = b.currentSeasonStats.fieldGoalsPercent ?? 0;
  if (Math.abs(fgA - fgB) >= 3) {
    const better = fgA > fgB ? a : b;
    insights.push(
      `${better.knownAs} tem melhor aproveitamento de arremessos (FG% ${Math.max(fgA, fgB).toFixed(1)}).`
    );
  }

  return insights;
}

export function buildComparisonReport(a: Player, b: Player): ComparisonReport {
  const sa = a.currentSeasonStats;
  const sb = b.currentSeasonStats;
  const isBasketball = sa.sport === "BASKETBALL" || a.sport === "BASKETBALL";
  const categories = comparisonCategoriesFor(isBasketball ? "BASKETBALL" : "SOCCER");
  const profileA = toComparisonProfile(sa);
  const profileB = toComparisonProfile(sb);

  const advantagesA: string[] = [];
  const advantagesB: string[] = [];
  const categoryWinsA: string[] = [];
  const categoryWinsB: string[] = [];

  for (const category of categories) {
    const diff = (profileA[category] ?? 0) - (profileB[category] ?? 0);
    if (Math.abs(diff) < 3) continue;

    if (diff > 0) {
      categoryWinsA.push(category);
      advantagesA.push(categoryAdvantageLabel(category, a.knownAs, Math.round(diff)));
    } else {
      categoryWinsB.push(category);
      advantagesB.push(categoryAdvantageLabel(category, b.knownAs, Math.round(Math.abs(diff))));
    }
  }

  const insights = [
    ...(isBasketball ? buildBasketballInsights(a, b) : buildSoccerInsights(a, b)),
  ];

  if (Math.abs(a.age - b.age) >= 3) {
    const younger = a.age < b.age ? a : b;
    insights.push(
      isBasketball
        ? `${younger.knownAs} é mais jovem — maior upside de desenvolvimento.`
        : `${younger.knownAs} is younger — greater upside potential.`
    );
  }

  const ratingDiff = sa.rating - sb.rating;
  let recommendation: string;
  if (Math.abs(ratingDiff) < 0.15 && categoryWinsA.length === categoryWinsB.length) {
    recommendation = isBasketball
      ? "Perfis muito próximos. A decisão deve priorizar fit tático, posição e custo (cap hit) no contexto do elenco."
      : "Profiles are closely matched. The decision should prioritize tactical fit and cost efficiency for the club context.";
  } else if (ratingDiff > 0.15 || categoryWinsA.length > categoryWinsB.length) {
    recommendation = isBasketball
      ? `${a.knownAs} apresenta o caso de scouting mais forte, com vantagem em ${categoryWinsA.length} dimensão(ões).`
      : `${a.knownAs} shows the stronger aggregate scouting case with ${categoryWinsA.length} superior dimension(s).`;
  } else {
    recommendation = isBasketball
      ? `${b.knownAs} apresenta o caso de scouting mais forte, com vantagem em ${categoryWinsB.length} dimensão(ões).`
      : `${b.knownAs} shows the stronger aggregate scouting case with ${categoryWinsB.length} superior dimension(s).`;
  }

  const categoryLeader = categoryWinsA.length >= categoryWinsB.length ? a : b;
  const categoryWinCount = Math.max(categoryWinsA.length, categoryWinsB.length);
  const summary = isBasketball
    ? `Comparando ${a.knownAs} (${sa.rating.toFixed(1)}) e ${b.knownAs} (${sb.rating.toFixed(1)}). ${categoryLeader.knownAs} lidera em ${categoryWinCount} de ${categories.length} categorias.`
    : `Comparing ${a.knownAs} (${sa.rating.toFixed(1)}) and ${b.knownAs} (${sb.rating.toFixed(1)}). ${categoryLeader.knownAs} leads in ${categoryWinCount} of ${categories.length} technical categories.`;

  if (advantagesA.length === 0) {
    advantagesA.push(
      isBasketball
        ? "Sem vantagem clara nas categorias — desempenho próximo do baseline do oponente."
        : "No clear edge in isolated categories — performance close to the opponent's baseline."
    );
  }
  if (advantagesB.length === 0) {
    advantagesB.push(
      isBasketball
        ? "Sem vantagem clara nas categorias — desempenho próximo do baseline do oponente."
        : "No clear edge in isolated categories — performance close to the opponent's baseline."
    );
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
