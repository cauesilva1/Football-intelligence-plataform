import { basketballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import type { IntelligenceEvidence, IntelligenceRole } from "@/lib/intelligence/types";
import { hasReliableBasketballSample } from "@/lib/scoring/basketball-rating";
import type { Player } from "@/types";

/** Conservative basketball roles from box-score rates — labels only when evidence supports them. */
export function classifyBasketballRole(player: Player): IntelligenceRole {
  const stats = player.currentSeasonStats;
  const group = basketballPositionGroup(player.position);
  const points = stats.points ?? 0;
  const assists = stats.assists;
  const rebounds = stats.rebounds ?? 0;
  const steals = stats.steals ?? 0;
  const blocks = stats.blocks ?? 0;
  const three = stats.threePointsPercent ?? 0;
  const fg = stats.fieldGoalsPercent ?? 0;
  const reliable = hasReliableBasketballSample({
    matchesPlayed: stats.appearances,
    minutesPlayed: stats.minutesPlayed,
  });
  const baseConfidence = reliable ? 0.78 : 0.45;

  if (group === "GUARD") {
    if (assists >= 6 && points >= 12) {
      return role("Primary Creator", baseConfidence, [
        { label: "APG", value: assists.toFixed(1) },
        { label: "PPG", value: points.toFixed(1) },
      ]);
    }
    if (assists >= 4.5) {
      return role("Secondary Creator", baseConfidence - 0.05, [
        { label: "APG", value: assists.toFixed(1) },
      ]);
    }
    if (three >= 36 && points >= 10) {
      return role("Floor Spacer", baseConfidence - 0.05, [
        { label: "3P%", value: `${three.toFixed(1)}%` },
        { label: "PPG", value: points.toFixed(1) },
      ]);
    }
    if (points >= 18) {
      return role("Scoring Guard", baseConfidence, [
        { label: "PPG", value: points.toFixed(1) },
      ]);
    }
    return role("Combo Guard", baseConfidence - 0.1, [
      { label: "PPG", value: points.toFixed(1) },
      { label: "APG", value: assists.toFixed(1) },
    ]);
  }

  if (group === "WING") {
    if (steals >= 1.2 && points >= 10) {
      return role("Two-Way Wing", baseConfidence, [
        { label: "SPG", value: steals.toFixed(1) },
        { label: "PPG", value: points.toFixed(1) },
      ]);
    }
    if (three >= 36 && points >= 10) {
      return role("Floor Spacer", baseConfidence - 0.05, [
        { label: "3P%", value: `${three.toFixed(1)}%` },
      ]);
    }
    if (points >= 16) {
      return role("Scoring Wing", baseConfidence, [
        { label: "PPG", value: points.toFixed(1) },
      ]);
    }
    return role("Versatile Wing", baseConfidence - 0.1, [
      { label: "PPG", value: points.toFixed(1) },
      { label: "RPG", value: rebounds.toFixed(1) },
    ]);
  }

  if (blocks >= 1.5 && rebounds >= 7) {
    return role("Defensive Anchor", baseConfidence, [
      { label: "BPG", value: blocks.toFixed(1) },
      { label: "RPG", value: rebounds.toFixed(1) },
    ]);
  }
  if (rebounds >= 9) {
    return role("Rebounding Big", baseConfidence, [
      { label: "RPG", value: rebounds.toFixed(1) },
    ]);
  }
  if (fg >= 55 && points >= 12) {
    return role("Rim Finisher", baseConfidence, [
      { label: "FG%", value: `${fg.toFixed(1)}%` },
      { label: "PPG", value: points.toFixed(1) },
    ]);
  }
  return role("Frontcourt Big", baseConfidence - 0.1, [
    { label: "PPG", value: points.toFixed(1) },
    { label: "RPG", value: rebounds.toFixed(1) },
  ]);
}

function role(label: string, confidence: number, evidence: IntelligenceEvidence[]): IntelligenceRole {
  return {
    label,
    confidence: Number(Math.min(0.95, Math.max(0.2, confidence)).toFixed(2)),
    evidence,
  };
}
