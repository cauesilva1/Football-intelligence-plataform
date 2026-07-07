import { SEASONS } from "@/lib/data/generators";
import type { PlayerStatistic } from "@/types";

export interface SeasonTimelinePoint {
  season: string;
  rating: number;
  goalsPer90: number;
  xGPer90: number;
  minutes: number;
  appearances: number;
}

/** Aggregates multi-club records into one point per season (minutes-weighted). */
export function aggregateSeasonTimeline(history: PlayerStatistic[]): SeasonTimelinePoint[] {
  const bySeason = new Map<string, PlayerStatistic[]>();

  for (const record of history) {
    const bucket = bySeason.get(record.season) ?? [];
    bucket.push(record);
    bySeason.set(record.season, bucket);
  }

  return SEASONS.filter((season) => bySeason.has(season)).map((season) => {
    const records = bySeason.get(season)!;
    const minutes = records.reduce((sum, r) => sum + r.minutesPlayed, 0);
    const appearances = records.reduce((sum, r) => sum + r.appearances, 0);
    const goals = records.reduce((sum, r) => sum + r.goals, 0);
    const xG = records.reduce((sum, r) => sum + r.xG, 0);
    const rating =
      minutes > 0
        ? records.reduce((sum, r) => sum + r.rating * r.minutesPlayed, 0) / minutes
        : records.reduce((sum, r) => sum + r.rating, 0) / records.length;

    return {
      season,
      rating: Number(rating.toFixed(2)),
      goalsPer90: minutes > 0 ? Number(((goals / minutes) * 90).toFixed(2)) : 0,
      xGPer90: minutes > 0 ? Number(((xG / minutes) * 90).toFixed(2)) : 0,
      minutes,
      appearances,
    };
  });
}
