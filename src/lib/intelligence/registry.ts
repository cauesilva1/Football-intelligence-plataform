import type { Sport } from "@/lib/sport";
import { americanFootballIntelligenceEngine } from "@/lib/intelligence/american-football/engine";
import { soccerIntelligenceEngine } from "@/lib/intelligence/soccer/engine";
import { basketballIntelligenceEngine } from "@/lib/intelligence/basketball/engine";
import type { IntelligenceEngine } from "@/lib/intelligence/types";

const ENGINES: Partial<Record<Sport, IntelligenceEngine>> = {
  SOCCER: soccerIntelligenceEngine,
  BASKETBALL: basketballIntelligenceEngine,
  AMERICAN_FOOTBALL: americanFootballIntelligenceEngine,
};

export function getIntelligenceEngine(sport: Sport): IntelligenceEngine | null {
  return ENGINES[sport] ?? null;
}

export function supportsIntelligence(sport: Sport): boolean {
  return getIntelligenceEngine(sport) != null;
}

export function listIntelligenceSports(): Sport[] {
  return (Object.keys(ENGINES) as Sport[]).filter((sport) => ENGINES[sport] != null);
}
