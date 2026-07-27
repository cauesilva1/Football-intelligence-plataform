import {
  buildBasketballPositionScorecard,
  buildFootballPositionScorecard,
  buildPositionScorecard,
} from "@/features/scouting/lib/position-scorecard";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import { hasReliableBasketballSample } from "@/lib/scoring/basketball-rating";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
import type { Player, ScoutingReport } from "@/types";

export interface ScoutingReportBriefContext {
  minutesPlayed: number;
  appearances: number;
  smallSample: boolean;
  sampleNote: string;
  keyRates: string[];
}

function scorecardToKeyRates(
  metrics: { key: string; label: string; value: string }[]
): string[] {
  return metrics
    .filter((m) => !["minutes", "apps", "rating"].includes(m.key))
    .map((m) => `${m.label}: ${m.value}`);
}

export function buildScoutBriefContext(player: Player): ScoutingReportBriefContext {
  const s = player.currentSeasonStats;
  const sport = player.sport ?? "SOCCER";

  if (sport === "BASKETBALL") {
    const smallSample = !hasReliableBasketballSample({
      matchesPlayed: s.appearances,
      minutesPlayed: s.minutesPlayed,
    });
    const scorecard = buildBasketballPositionScorecard(player.position, s);
    return {
      minutesPlayed: s.minutesPlayed,
      appearances: s.appearances,
      smallSample,
      sampleNote: smallSample
        ? "Provisional rating — need ≥10 games and ≥200′ for full rates."
        : "Reliable sample — rates match profile methodology.",
      keyRates: scorecardToKeyRates(scorecard.metrics),
    };
  }

  if (sport === "AMERICAN_FOOTBALL") {
    const smallSample = !hasReliableFootballSample({
      matchesPlayed: s.appearances,
      minutesPlayed: s.minutesPlayed,
    });
    const scorecard = buildFootballPositionScorecard(player.position, s);
    return {
      minutesPlayed: s.minutesPlayed,
      appearances: s.appearances,
      smallSample,
      sampleNote: smallSample
        ? "Provisional rating — need ≥6 games and ≥360′ proxy minutes."
        : "Reliable sample — rates match profile methodology.",
      keyRates: scorecardToKeyRates(scorecard.metrics),
    };
  }

  const smallSample = !hasReliableSoccerSample(s.minutesPlayed);
  const scorecard = buildPositionScorecard(player.position, s);
  return {
    minutesPlayed: s.minutesPlayed,
    appearances: s.appearances,
    smallSample,
    sampleNote: smallSample
      ? "Provisional rating — per-90 rates after ≥450′ (season totals shown on profile)."
      : "Reliable sample — per-90 rates match profile scorecard.",
    keyRates: scorecardToKeyRates(scorecard.metrics),
  };
}

export function withBriefContext(report: ScoutingReport, player: Player): ScoutingReport {
  return {
    ...report,
    briefContext: buildScoutBriefContext(player),
  };
}
