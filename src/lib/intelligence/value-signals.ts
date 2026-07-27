import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { capValueScore } from "@/lib/scoring";
import { soccerValueScore } from "@/lib/scoring/soccer-rankings";
import type { Sport } from "@/lib/sport";
import type { Player } from "@/types";

export type ValueSignalKind = "undervalued" | "unavailable" | "neutral";

export interface ValueSignal {
  kind: ValueSignalKind;
  label: string;
  description: string;
  valueScore?: number;
  cohortSize: number;
  limitations: string[];
}

function positionPeers(player: Player): string[] {
  const sport = (player.sport ?? "SOCCER") as Sport;
  if (sport === "BASKETBALL") return similarBasketballPositionGroup(player.position);
  if (sport === "AMERICAN_FOOTBALL") return similarFootballPositionGroup(player.position);
  return similarPositionGroup(player.position);
}

function percentileRank(sortedAsc: number[], value: number): number {
  if (sortedAsc.length === 0) return 0;
  let below = 0;
  for (const sample of sortedAsc) {
    if (sample < value) below += 1;
  }
  return below / sortedAsc.length;
}

/**
 * Honest age-peer value signal.
 * Soccer uses marketValue; BB/AF only when capHit > 0 — otherwise unavailable.
 */
export function deriveAgePeerValueSignal(
  player: Player,
  cohort: Player[],
  options: { ageWindow?: number } = {}
): ValueSignal {
  const sport = (player.sport ?? "SOCCER") as Sport;
  const ageWindow = options.ageWindow ?? 2;
  const peers = positionPeers(player);
  const agePeers = cohort.filter(
    (candidate) =>
      candidate.id !== player.id &&
      peers.includes(candidate.position) &&
      Math.abs(candidate.age - player.age) <= ageWindow
  );

  if (sport === "SOCCER") {
    if (player.marketValue <= 0) {
      return {
        kind: "unavailable",
        label: "Value N/A",
        description: "No market value on file — undervalued signal skipped.",
        cohortSize: agePeers.length,
        limitations: ["Market value missing for this player."],
      };
    }

    const priced = agePeers.filter((candidate) => candidate.marketValue > 0);
    const playerScore = soccerValueScore(
      player.currentSeasonStats.rating,
      player.marketValue
    );
    const scores = priced
      .map((candidate) =>
        soccerValueScore(candidate.currentSeasonStats.rating, candidate.marketValue)
      )
      .sort((a, b) => a - b);

    if (scores.length < 8) {
      return {
        kind: "neutral",
        label: "Thin value cohort",
        description: `Only ${scores.length} age/position peers with market value — signal is provisional.`,
        valueScore: playerScore,
        cohortSize: scores.length,
        limitations: ["Age-peer cohort too small for a firm undervalued call."],
      };
    }

    const pct = percentileRank(scores, playerScore);
    if (pct >= 0.75 && player.currentSeasonStats.rating >= 6.8) {
      return {
        kind: "undervalued",
        label: "Undervalued vs age peers",
        description: `Rating-per-€M above ~${Math.round(pct * 100)}th percentile of ${scores.length} age/position peers (heuristic).`,
        valueScore: playerScore,
        cohortSize: scores.length,
        limitations: [
          "Heuristic Transfermarkt-style market value — not a true market clearing price.",
        ],
      };
    }

    return {
      kind: "neutral",
      label: "Fair value band",
      description: `Value score sits around the ${Math.round(pct * 100)}th percentile of age/position peers.`,
      valueScore: playerScore,
      cohortSize: scores.length,
      limitations: [],
    };
  }

  const cap = player.capHit ?? 0;
  if (cap <= 0) {
    return {
      kind: "unavailable",
      label: "Salary N/A",
      description:
        sport === "BASKETBALL"
          ? "Cap hit only on some NBA rosters — value signal skipped."
          : "Cap hit only on some NFL rosters — value signal skipped.",
      cohortSize: agePeers.length,
      limitations: ["Salary/cap data unavailable for this player."],
    };
  }

  const priced = agePeers.filter((candidate) => (candidate.capHit ?? 0) > 0);
  const playerScore = capValueScore(player.currentSeasonStats.rating, cap);
  const scores = priced
    .map((candidate) =>
      capValueScore(candidate.currentSeasonStats.rating, candidate.capHit ?? 0)
    )
    .sort((a, b) => a - b);

  if (scores.length < 8) {
    return {
      kind: "neutral",
      label: "Thin salary cohort",
      description: `Only ${scores.length} age/position peers with salary — signal is provisional.`,
      valueScore: playerScore,
      cohortSize: scores.length,
      limitations: ["Salary peer cohort too small for a firm undervalued call."],
    };
  }

  const pct = percentileRank(scores, playerScore);
  if (pct >= 0.75 && player.currentSeasonStats.rating >= 6.8) {
    return {
      kind: "undervalued",
      label: "Undervalued vs age peers",
      description: `Rating-per-$1M cap above ~${Math.round(pct * 100)}th percentile of ${scores.length} salary peers (heuristic).`,
      valueScore: playerScore,
      cohortSize: scores.length,
      limitations: ["Cap hit coverage is incomplete outside top professional leagues."],
    };
  }

  return {
    kind: "neutral",
    label: "Fair salary band",
    description: `Cap value score sits around the ${Math.round(pct * 100)}th percentile of salary peers.`,
    valueScore: playerScore,
    cohortSize: scores.length,
    limitations: [],
  };
}
