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
  return `${category}: ${playerName} (+${margin} index pts)`;
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
    insights.push(`${better.knownAs} generates more xG per 90 (${Math.max(xgA, xgB).toFixed(2)}).`);
  }

  if (Math.abs(sa.passAccuracy - sb.passAccuracy) > 2) {
    const better = sa.passAccuracy > sb.passAccuracy ? a : b;
    insights.push(`${better.knownAs} shows higher pass accuracy (${better.currentSeasonStats.passAccuracy.toFixed(0)}%).`);
  }

  if (Math.abs(a.age - b.age) >= 3) {
    const younger = a.age < b.age ? a : b;
    insights.push(`${younger.knownAs} is younger — greater upside potential.`);
  }

  const ratingDiff = sa.rating - sb.rating;
  let recommendation: string;
  if (Math.abs(ratingDiff) < 0.15 && categoryWinsA.length === categoryWinsB.length) {
    recommendation =
      "Profiles are closely matched. The decision should prioritize tactical fit and cost efficiency for the club context.";
  } else if (ratingDiff > 0.15 || categoryWinsA.length > categoryWinsB.length) {
    recommendation = `${a.knownAs} shows the stronger aggregate scouting case with ${categoryWinsA.length} superior dimension(s).`;
  } else {
    recommendation = `${b.knownAs} shows the stronger aggregate scouting case with ${categoryWinsB.length} superior dimension(s).`;
  }

  const categoryLeader = categoryWinsA.length >= categoryWinsB.length ? a : b;
  const categoryWinCount = Math.max(categoryWinsA.length, categoryWinsB.length);
  const summary = `Comparing ${a.knownAs} (${sa.rating.toFixed(1)}) and ${b.knownAs} (${sb.rating.toFixed(1)}). ${categoryLeader.knownAs} leads in ${categoryWinCount} of ${COMPARISON_CATEGORIES.length} technical categories.`;

  if (advantagesA.length === 0) {
    advantagesA.push("No clear edge in isolated categories — performance close to the opponent's baseline.");
  }
  if (advantagesB.length === 0) {
    advantagesB.push("No clear edge in isolated categories — performance close to the opponent's baseline.");
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
