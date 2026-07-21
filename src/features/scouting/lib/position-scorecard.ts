import type { PlayerStatistic } from "@/types";
import { hasReliableSoccerSample, per90 } from "@/lib/metrics/per90";
import { SOCCER_RATE_SOFT_CAP } from "@/lib/scoring";

export type SoccerPositionGroup = "GK" | "DEF" | "MID" | "ATT";

export function soccerPositionGroup(position: string): SoccerPositionGroup {
  if (position === "GK") return "GK";
  if (["ST", "LW", "RW", "CF"].includes(position)) return "ATT";
  if (["CAM", "CM", "CDM", "LM", "RM"].includes(position)) return "MID";
  return "DEF";
}

export function soccerPositionGroupLabel(group: SoccerPositionGroup): string {
  switch (group) {
    case "GK":
      return "Goalkeeper";
    case "DEF":
      return "Defender";
    case "MID":
      return "Midfielder";
    case "ATT":
      return "Attacker";
  }
}

export type ScorecardMetric = {
  key: string;
  label: string;
  value: string;
  hint?: string;
};

/** Role-aware metric pack for soccer profiles — ST vs CB highlight different rates. */
export function buildPositionScorecard(
  position: string,
  stats: PlayerStatistic
): { group: SoccerPositionGroup; title: string; metrics: ScorecardMetric[] } {
  const group = soccerPositionGroup(position);
  const reliable = hasReliableSoccerSample(stats.minutesPlayed);
  const rate = (total: number, cap = SOCCER_RATE_SOFT_CAP) =>
    reliable
      ? per90(total, stats.minutesPlayed, { softCap: cap }).toFixed(2)
      : "—";

  /** When sample is thin, show season totals instead of blank per-90 dashes. */
  const rateOrTotal = (
    total: number,
    per90Label: string,
    totalLabel: string,
    cap = SOCCER_RATE_SOFT_CAP
  ): ScorecardMetric => {
    if (reliable) {
      return { key: per90Label, label: per90Label, value: rate(total, cap) };
    }
    return {
      key: totalLabel,
      label: totalLabel,
      value: Number.isInteger(total) ? String(total) : total.toFixed(0),
      hint: "Season total (rates after ≥450′)",
    };
  };

  const shared: ScorecardMetric[] = [
    {
      key: "minutes",
      label: "Minutes",
      value: stats.minutesPlayed > 0 ? stats.minutesPlayed.toLocaleString("en-US") : "—",
    },
    {
      key: "apps",
      label: "Apps",
      value: String(stats.appearances),
    },
    {
      key: "rating",
      label: "Rating",
      value: stats.rating.toFixed(1),
      hint: reliable ? undefined : "Provisional (small sample)",
    },
  ];

  if (group === "ATT") {
    return {
      group,
      title: "Attack scorecard",
      metrics: [
        ...shared,
        rateOrTotal(stats.goals, "Goals / 90", "Goals"),
        reliable
          ? {
              key: "xg90",
              label: "xG / 90",
              value: (stats.minutesPlayed > 0 ? (stats.xG / stats.minutesPlayed) * 90 : 0).toFixed(2),
            }
          : {
              key: "xg",
              label: "xG",
              value: stats.xG.toFixed(2),
              hint: "Season total (rates after ≥450′)",
            },
        rateOrTotal(stats.assists, "Assists / 90", "Assists"),
        { key: "sot", label: "Shots on target", value: String(stats.shotsOnTarget) },
      ],
    };
  }

  if (group === "MID") {
    return {
      group,
      title: "Midfield scorecard",
      metrics: [
        ...shared,
        rateOrTotal(stats.assists, "Assists / 90", "Assists"),
        rateOrTotal(stats.keyPasses, "Key passes / 90", "Key passes"),
        { key: "pass", label: "Pass accuracy", value: `${stats.passAccuracy.toFixed(0)}%` },
        rateOrTotal(stats.tacklesWon, "Tackles / 90", "Tackles", 8),
      ],
    };
  }

  if (group === "GK") {
    return {
      group,
      title: "Goalkeeper scorecard",
      metrics: [
        ...shared,
        { key: "pass", label: "Pass accuracy", value: `${stats.passAccuracy.toFixed(0)}%` },
        rateOrTotal(stats.interceptions, "Interceptions / 90", "Interceptions", 8),
      ],
    };
  }

  return {
    group,
    title: "Defensive scorecard",
    metrics: [
      ...shared,
      rateOrTotal(stats.tacklesWon, "Tackles / 90", "Tackles", 8),
      rateOrTotal(stats.interceptions, "Interceptions / 90", "Interceptions", 8),
      {
        key: "duels",
        label: "Duels won",
        value: stats.duelsWonPct > 0 ? `${stats.duelsWonPct.toFixed(0)}%` : "—",
      },
      {
        key: "pass",
        label: "Pass accuracy",
        value: stats.passAccuracy > 0 ? `${stats.passAccuracy.toFixed(0)}%` : "—",
      },
    ],
  };
}

/** Positions that share a similarity weight group (not exact position only). */
export function similarPositionGroup(position: string): string[] {
  const group = soccerPositionGroup(position);
  if (group === "GK") return ["GK"];
  if (group === "ATT") return ["ST", "LW", "RW", "CF", "CAM"];
  if (group === "MID") return ["CM", "CDM", "CAM", "LM", "RM"];
  return ["CB", "LB", "RB", "LWB", "RWB", "CDM"];
}
