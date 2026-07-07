import type { PlayerStatistic } from "@/types";
import { computePer90Metrics } from "@/lib/metrics/per90";

export interface StatisticInput {
  id: string;
  playerId: string;
  teamId: string;
  teamName?: string;
  teamShortName?: string;
  season: string;
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  xG: number;
  xA: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  keyPasses: number;
  dribblesCompleted: number;
  tacklesWon: number;
  interceptions: number;
  duelsWonPct: number;
  yellowCards: number;
  redCards: number;
  rating: number;
}

export function toPlayerStatistic(input: StatisticInput): PlayerStatistic {
  return {
    ...input,
    per90: computePer90Metrics(input),
  };
}
