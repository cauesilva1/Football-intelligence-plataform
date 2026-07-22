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

export type BasketballPositionGroup = "GUARD" | "WING" | "BIG";

export function basketballPositionGroup(position: string): BasketballPositionGroup {
  if (["PG", "SG"].includes(position)) return "GUARD";
  if (position === "SF") return "WING";
  return "BIG";
}

/** Role-aware metric pack for basketball profiles — guard vs big highlight different lines. */
export function buildBasketballPositionScorecard(
  position: string,
  stats: PlayerStatistic
): { group: BasketballPositionGroup; title: string; metrics: ScorecardMetric[] } {
  const group = basketballPositionGroup(position);
  const g = stats.perGame ?? {
    points: stats.points ?? 0,
    rebounds: stats.rebounds ?? 0,
    steals: stats.steals ?? 0,
    blocks: stats.blocks ?? 0,
    assists: stats.assists,
  };
  const reliable =
    stats.appearances >= 10 && stats.minutesPlayed >= 200;
  const mpg =
    stats.appearances > 0 ? stats.minutesPlayed / stats.appearances : 0;

  const shared: ScorecardMetric[] = [
    {
      key: "games",
      label: "Games",
      value: String(stats.appearances),
    },
    {
      key: "mpg",
      label: "MPG",
      value: mpg > 0 ? mpg.toFixed(1) : "—",
    },
    {
      key: "rating",
      label: "Rating",
      value: stats.rating.toFixed(1),
      hint: reliable ? undefined : "Provisional (small sample)",
    },
  ];

  if (group === "GUARD") {
    return {
      group,
      title: "Guard scorecard",
      metrics: [
        ...shared,
        { key: "ppg", label: "PPG", value: g.points.toFixed(1) },
        { key: "apg", label: "APG", value: g.assists.toFixed(1) },
        {
          key: "3p",
          label: "3P%",
          value: `${(stats.threePointsPercent ?? 0).toFixed(1)}%`,
        },
        { key: "spg", label: "SPG", value: g.steals.toFixed(1) },
      ],
    };
  }

  if (group === "WING") {
    return {
      group,
      title: "Wing scorecard",
      metrics: [
        ...shared,
        { key: "ppg", label: "PPG", value: g.points.toFixed(1) },
        { key: "rpg", label: "RPG", value: g.rebounds.toFixed(1) },
        {
          key: "3p",
          label: "3P%",
          value: `${(stats.threePointsPercent ?? 0).toFixed(1)}%`,
        },
        {
          key: "fg",
          label: "FG%",
          value: `${(stats.fieldGoalsPercent ?? 0).toFixed(1)}%`,
        },
      ],
    };
  }

  return {
    group,
    title: "Big scorecard",
    metrics: [
      ...shared,
      { key: "rpg", label: "RPG", value: g.rebounds.toFixed(1) },
      { key: "bpg", label: "BPG", value: g.blocks.toFixed(1) },
      {
        key: "fg",
        label: "FG%",
        value: `${(stats.fieldGoalsPercent ?? 0).toFixed(1)}%`,
      },
      { key: "ppg", label: "PPG", value: g.points.toFixed(1) },
    ],
  };
}

export function similarBasketballPositionGroup(position: string): string[] {
  const group = basketballPositionGroup(position);
  if (group === "GUARD") return ["PG", "SG"];
  if (group === "WING") return ["SF", "SG", "PF"];
  return ["PF", "C"];
}

export type FootballPositionGroup = "QB" | "SKILL" | "OL" | "DEFENSE" | "SPECIALIST";

export function footballPositionGroup(position: string): FootballPositionGroup {
  const p = position.toUpperCase();
  if (p === "QB") return "QB";
  if (["WR", "TE", "RB", "FB", "HB"].includes(p)) return "SKILL";
  if (["OT", "OG", "C", "OL", "G", "T"].includes(p)) return "OL";
  if (["K", "P", "LS", "PK"].includes(p)) return "SPECIALIST";
  return "DEFENSE";
}

/** Role-aware metric pack for American football profiles. */
export function buildFootballPositionScorecard(
  position: string,
  stats: PlayerStatistic
): { group: FootballPositionGroup; title: string; metrics: ScorecardMetric[] } {
  const group = footballPositionGroup(position);
  const reliable = stats.appearances >= 6 && stats.minutesPlayed >= 360;
  const games = Math.max(stats.appearances, 1);
  const passYds = stats.passingYards ?? 0;
  const rushYds = stats.rushingYards ?? 0;
  const recYds = stats.receivingYards ?? 0;
  const tds = stats.touchdowns ?? stats.goals ?? 0;
  const sacks = stats.sacks ?? 0;

  const shared: ScorecardMetric[] = [
    { key: "games", label: "Games", value: String(stats.appearances) },
    {
      key: "rating",
      label: "Rating",
      value: stats.rating.toFixed(1),
      hint: reliable ? undefined : "Provisional (small sample)",
    },
  ];

  if (group === "QB") {
    return {
      group,
      title: "QB scorecard",
      metrics: [
        ...shared,
        { key: "pass", label: "Pass Yds", value: passYds.toLocaleString("en-US") },
        { key: "td", label: "TD", value: String(tds) },
        {
          key: "ypg",
          label: "Yds/G",
          value: ((passYds + rushYds) / games).toFixed(0),
        },
        {
          key: "comp",
          label: "Comp %",
          value: stats.passAccuracy > 0 ? `${stats.passAccuracy.toFixed(1)}%` : "—",
        },
      ],
    };
  }

  if (group === "SKILL") {
    return {
      group,
      title: "Skill scorecard",
      metrics: [
        ...shared,
        { key: "recYds", label: "Rec Yds", value: recYds.toLocaleString("en-US") },
        { key: "rush", label: "Rush Yds", value: rushYds.toLocaleString("en-US") },
        { key: "td", label: "TD", value: String(tds) },
        { key: "receptions", label: "Receptions", value: String(stats.assists) },
      ],
    };
  }

  if (group === "DEFENSE") {
    return {
      group,
      title: "Defense scorecard",
      metrics: [
        ...shared,
        { key: "tkl", label: "Tackles", value: String(stats.tacklesWon) },
        { key: "sack", label: "Sacks", value: sacks.toFixed(1) },
        { key: "int", label: "INT", value: String(stats.interceptions) },
        { key: "td", label: "TD", value: String(tds) },
      ],
    };
  }

  return {
    group,
    title: group === "SPECIALIST" ? "Specialist scorecard" : "OL scorecard",
    metrics: [
      ...shared,
      { key: "games2", label: "Games", value: String(stats.appearances) },
      { key: "td", label: "TD", value: String(tds) },
      {
        key: "yards",
        label: "Total Yds",
        value: (stats.totalYards ?? 0).toLocaleString("en-US"),
      },
    ],
  };
}

export function similarFootballPositionGroup(position: string): string[] {
  const group = footballPositionGroup(position);
  if (group === "QB") return ["QB"];
  if (group === "SKILL") return ["WR", "TE", "RB", "FB", "HB"];
  if (group === "OL") return ["OL", "OT", "OG", "C", "G", "T"];
  if (group === "SPECIALIST") return ["K", "P", "LS", "PK"];
  return ["DL", "LB", "CB", "S", "DE", "DT", "EDGE"];
}
