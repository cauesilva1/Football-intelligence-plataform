import {
  buildBasketballPositionScorecard,
  buildFootballPositionScorecard,
  buildPositionScorecard,
} from "@/features/scouting/lib/position-scorecard";
import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { adaptSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/adapter";
import {
  formatBriefIntelligenceLines,
  toBriefIntelligenceSnapshot,
  type ScoutingReportBriefIntelligence,
} from "@/lib/export/scout-brief-intelligence";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import { hasReliableBasketballSample } from "@/lib/scoring/basketball-rating";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
import type { Player, ScoutingReport } from "@/types";

export type { ScoutingReportBriefIntelligence };

export interface ScoutingReportBriefContext {
  minutesPlayed: number;
  appearances: number;
  smallSample: boolean;
  sampleNote: string;
  keyRates: string[];
  /** Soccer intelligence snapshot — aligned with headless profile engine. */
  intelligence?: ScoutingReportBriefIntelligence;
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
    const intelligence = toBriefIntelligenceSnapshot(
      buildBasketballIntelligenceProfile(player)
    );
    return {
      minutesPlayed: s.minutesPlayed,
      appearances: s.appearances,
      smallSample,
      sampleNote: smallSample
        ? "Provisional rating — need ≥10 games and ≥200′ for full rates."
        : "Reliable sample — rates match profile methodology.",
      keyRates: [
        ...scorecardToKeyRates(scorecard.metrics),
        ...formatBriefIntelligenceLines(intelligence),
      ],
      intelligence,
    };
  }

  if (sport === "AMERICAN_FOOTBALL") {
    const smallSample = !hasReliableFootballSample({
      matchesPlayed: s.appearances,
      minutesPlayed: s.minutesPlayed,
    });
    const scorecard = buildFootballPositionScorecard(player.position, s);
    const intelligence = toBriefIntelligenceSnapshot(
      buildAmericanFootballIntelligenceProfile(player)
    );
    return {
      minutesPlayed: s.minutesPlayed,
      appearances: s.appearances,
      smallSample,
      sampleNote: smallSample
        ? "Provisional rating — need ≥6 games and ≥360′ proxy minutes."
        : "Reliable sample — rates match profile methodology.",
      keyRates: [
        ...scorecardToKeyRates(scorecard.metrics),
        ...formatBriefIntelligenceLines(intelligence),
      ],
      intelligence,
    };
  }

  const smallSample = !hasReliableSoccerSample(s.minutesPlayed);
  const scorecard = buildPositionScorecard(player.position, s);
  const intelligence = toBriefIntelligenceSnapshot(
    adaptSoccerIntelligenceProfile(buildSoccerIntelligenceProfile(player))
  );
  return {
    minutesPlayed: s.minutesPlayed,
    appearances: s.appearances,
    smallSample,
    sampleNote: smallSample
      ? "Provisional rating — per-90 rates after ≥450′ (season totals shown on profile)."
      : "Reliable sample — per-90 rates match profile scorecard.",
    keyRates: [
      ...scorecardToKeyRates(scorecard.metrics),
      ...formatBriefIntelligenceLines(intelligence),
    ],
    intelligence,
  };
}

export function withBriefContext(report: ScoutingReport, player: Player): ScoutingReport {
  return {
    ...report,
    briefContext: buildScoutBriefContext(player),
  };
}
