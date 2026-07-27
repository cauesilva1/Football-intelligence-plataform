import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { adaptSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/adapter";
import { explainSoccerSimilarity } from "@/lib/intelligence/soccer/explain-similarity";
import type { LeaguePositionPercentileTable } from "@/lib/intelligence/soccer/league-percentiles";
import type {
  BuildIntelligenceProfileOptions,
  IntelligenceEngine,
  IntelligenceProfile,
} from "@/lib/intelligence/types";
import type { Player } from "@/types";

export const soccerIntelligenceEngine: IntelligenceEngine = {
  sport: "SOCCER",
  buildProfile(player: Player, options: BuildIntelligenceProfileOptions = {}): IntelligenceProfile {
    const soccerProfile = buildSoccerIntelligenceProfile(player, {
      comparablesPool: options.comparablesPool,
      comparablesLimit: options.comparablesLimit,
      percentileTable: options.percentileTable as LeaguePositionPercentileTable | null | undefined,
    });
    return adaptSoccerIntelligenceProfile(soccerProfile);
  },
  explainSimilarity(target: Player, candidate: Player, limit = 3): string[] {
    return explainSoccerSimilarity(target, candidate, limit);
  },
};
