import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import { explainBasketballSimilarity } from "@/lib/intelligence/basketball/explain-similarity";
import type { BasketballLeaguePositionPercentileTable } from "@/lib/intelligence/basketball/league-percentiles";
import type {
  BuildIntelligenceProfileOptions,
  IntelligenceEngine,
  IntelligenceProfile,
} from "@/lib/intelligence/types";
import type { Player } from "@/types";

export const basketballIntelligenceEngine: IntelligenceEngine = {
  sport: "BASKETBALL",
  buildProfile(player: Player, options: BuildIntelligenceProfileOptions = {}): IntelligenceProfile {
    return buildBasketballIntelligenceProfile(player, {
      comparablesPool: options.comparablesPool,
      comparablesLimit: options.comparablesLimit,
      percentileTable: options.percentileTable as
        | BasketballLeaguePositionPercentileTable
        | null
        | undefined,
    });
  },
  explainSimilarity(target: Player, candidate: Player, limit = 3): string[] {
    return explainBasketballSimilarity(target, candidate, limit);
  },
};
