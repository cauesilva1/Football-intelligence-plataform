import { footballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import type { IntelligenceEvidence, IntelligenceRole } from "@/lib/intelligence/types";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
import type { Player } from "@/types";

/** Conservative AF roles from available season lines — no invented scheme labels. */
export function classifyAmericanFootballRole(player: Player): IntelligenceRole {
  const stats = player.currentSeasonStats;
  const group = footballPositionGroup(player.position);
  const games = Math.max(stats.appearances, 1);
  const passYds = stats.passingYards ?? 0;
  const rushYds = stats.rushingYards ?? 0;
  const recYds = stats.receivingYards ?? 0;
  const tds = stats.touchdowns ?? stats.goals ?? 0;
  const sacks = stats.sacks ?? 0;
  const tackles = stats.tacklesWon;
  const ints = stats.interceptions;
  const reliable = hasReliableFootballSample({
    matchesPlayed: stats.appearances,
    minutesPlayed: stats.minutesPlayed,
  });
  const baseConfidence = reliable ? 0.78 : 0.42;

  if (group === "QB") {
    if (rushYds / games >= 25 && passYds / games >= 180) {
      return role("Dual-Threat QB", baseConfidence, [
        { label: "Pass Yds/G", value: (passYds / games).toFixed(0) },
        { label: "Rush Yds/G", value: (rushYds / games).toFixed(0) },
      ]);
    }
    if (passYds / games >= 220 || tds / games >= 1.5) {
      return role("Pocket Passer", baseConfidence, [
        { label: "Pass Yds/G", value: (passYds / games).toFixed(0) },
        { label: "TD", value: String(tds) },
      ]);
    }
    return role("Developing QB", baseConfidence - 0.1, [
      { label: "Pass Yds", value: String(passYds) },
      { label: "Games", value: String(stats.appearances) },
    ]);
  }

  if (group === "SKILL") {
    if (player.position === "RB" || player.position === "FB" || player.position === "HB") {
      if (rushYds / games >= 60) {
        return role("Feature Back", baseConfidence, [
          { label: "Rush Yds/G", value: (rushYds / games).toFixed(0) },
        ]);
      }
      return role("Complementary Back", baseConfidence - 0.05, [
        { label: "Rush Yds", value: String(rushYds) },
        { label: "Rec Yds", value: String(recYds) },
      ]);
    }
    if (recYds / games >= 65 || tds / games >= 0.6) {
      return role("Vertical Threat WR", baseConfidence, [
        { label: "Rec Yds/G", value: (recYds / games).toFixed(0) },
        { label: "TD", value: String(tds) },
      ]);
    }
    if (player.position === "TE" && (recYds > 0 || tds > 0)) {
      return role("Receiving TE", baseConfidence - 0.05, [
        { label: "Rec Yds", value: String(recYds) },
        { label: "TD", value: String(tds) },
      ]);
    }
    return role("Skill Contributor", baseConfidence - 0.1, [
      { label: "Rec Yds", value: String(recYds) },
      { label: "Rush Yds", value: String(rushYds) },
    ]);
  }

  if (group === "DEFENSE") {
    if (sacks / games >= 0.5) {
      return role("Pass Rush Threat", baseConfidence, [
        { label: "Sacks", value: sacks.toFixed(1) },
      ]);
    }
    if (tackles / games >= 6) {
      return role("Run Stopper", baseConfidence, [
        { label: "Tackles/G", value: (tackles / games).toFixed(1) },
      ]);
    }
    if (ints >= 2 || (stats.interceptions ?? 0) / games >= 0.15) {
      return role("Coverage Defender", baseConfidence, [
        { label: "INT", value: String(ints) },
      ]);
    }
    return role("Defensive Contributor", baseConfidence - 0.1, [
      { label: "Tackles", value: tackles.toFixed(1) },
      { label: "Sacks", value: sacks.toFixed(1) },
    ]);
  }

  if (group === "SPECIALIST") {
    return role("Specialist", baseConfidence - 0.15, [
      { label: "Games", value: String(stats.appearances) },
      { label: "TD", value: String(tds) },
    ]);
  }

  return role("Offensive Lineman", Math.min(baseConfidence, 0.4), [
    { label: "Games", value: String(stats.appearances) },
    {
      label: "Limitation",
      value: "Blocking grades not in feed — role is participation-based",
    },
  ]);
}

function role(label: string, confidence: number, evidence: IntelligenceEvidence[]): IntelligenceRole {
  return {
    label,
    confidence: Number(Math.min(0.95, Math.max(0.2, confidence)).toFixed(2)),
    evidence,
  };
}
