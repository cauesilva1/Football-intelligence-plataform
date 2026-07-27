import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import { explainAmericanFootballSimilarity } from "@/lib/intelligence/american-football/explain-similarity";
import type { AmericanFootballLeaguePositionPercentileTable } from "@/lib/intelligence/american-football/league-percentiles";
import type {
  BuildIntelligenceProfileOptions,
  IntelligenceEngine,
  IntelligenceProfile,
} from "@/lib/intelligence/types";
import type { Player } from "@/types";

export const americanFootballIntelligenceEngine: IntelligenceEngine = {
  sport: "AMERICAN_FOOTBALL",
  buildProfile(player: Player, options: BuildIntelligenceProfileOptions = {}): IntelligenceProfile {
    return buildAmericanFootballIntelligenceProfile(player, {
      comparablesPool: options.comparablesPool,
      comparablesLimit: options.comparablesLimit,
      percentileTable: options.percentileTable as
        | AmericanFootballLeaguePositionPercentileTable
        | null
        | undefined,
    });
  },
  explainSimilarity(target: Player, candidate: Player, limit = 3): string[] {
    return explainAmericanFootballSimilarity(target, candidate, limit);
  },
};
