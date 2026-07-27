import type { PlayerIntelligenceProfile } from "@/lib/intelligence/soccer/types";
import type { IntelligenceProfile, TrajectoryDirection } from "@/lib/intelligence/types";

/** Map soccer-native flat profile → shared IntelligenceProfile without changing soccer internals. */
export function adaptSoccerIntelligenceProfile(
  profile: PlayerIntelligenceProfile
): IntelligenceProfile {
  return {
    sport: profile.sport,
    playerId: profile.playerId,
    season: profile.season,
    role: {
      label: profile.role,
      confidence: averageConfidence(profile),
      evidence: profile.styleTraits.map((trait) => ({
        label: "Style trait",
        value: trait,
      })),
    },
    styleLabel: profile.styleLabel,
    styleTraits: profile.styleTraits,
    dimensions: profile.dimensions.map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      score: dimension.score,
      confidence: dimension.confidence,
      evidence: dimension.evidence,
    })),
    trajectory: {
      direction: profile.trajectory as TrajectoryDirection,
      evidence: [],
    },
    limitations: profile.limitations,
    comparables: profile.comparables,
    leagueContext: profile.leagueContext,
  };
}

function averageConfidence(profile: PlayerIntelligenceProfile): number {
  if (profile.dimensions.length === 0) return 0.5;
  const sum = profile.dimensions.reduce((acc, dimension) => acc + dimension.confidence, 0);
  return Number((sum / profile.dimensions.length).toFixed(2));
}
