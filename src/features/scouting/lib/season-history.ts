import { SEASONS } from "@/lib/data/generators";
import type { PlayerStatistic } from "@/types";
import type { Sport } from "@/lib/sport";

export interface SeasonTimelinePoint {
  season: string;
  rating: number;
  goalsPer90: number;
  xGPer90: number;
  minutes: number;
  appearances: number;
}

function sortSeasonLabels(seasons: string[]): string[] {
  return [...new Set(seasons)].sort((a, b) => {
    const yearA = Number.parseInt(a.split("/")[0] ?? a, 10);
    const yearB = Number.parseInt(b.split("/")[0] ?? b, 10);
    return yearA - yearB;
  });
}

/** Aggregates multi-club records into one point per season (minutes-weighted). */
export function aggregateSeasonTimeline(
  history: PlayerStatistic[],
  sport: Sport = "SOCCER"
): SeasonTimelinePoint[] {
  const bySeason = new Map<string, PlayerStatistic[]>();

  for (const record of history) {
    const bucket = bySeason.get(record.season) ?? [];
    bucket.push(record);
    bySeason.set(record.season, bucket);
  }

  const seasons = sortSeasonLabels([
    ...SEASONS.filter((season) => bySeason.has(season)),
    ...[...bySeason.keys()].filter((season) => !SEASONS.includes(season as (typeof SEASONS)[number])),
  ]);

  return seasons.map((season) => {
    const records = bySeason.get(season)!;
    const minutes = records.reduce((sum, r) => sum + r.minutesPlayed, 0);
    const appearances = records.reduce((sum, r) => sum + r.appearances, 0);
    const rating =
      minutes > 0
        ? records.reduce((sum, r) => sum + r.rating * r.minutesPlayed, 0) / minutes
        : records.reduce((sum, r) => sum + r.rating, 0) / records.length;

    if (sport === "BASKETBALL") {
      const points = records.reduce((sum, r) => sum + (r.points ?? 0) * Math.max(r.appearances, 1), 0);
      const games = Math.max(appearances, 1);
      const pointsPerGame = points / games;

      return {
        season,
        rating: Number(rating.toFixed(2)),
        goalsPer90: Number(pointsPerGame.toFixed(2)),
        xGPer90: 0,
        minutes,
        appearances,
      };
    }

    if (sport === "AMERICAN_FOOTBALL") {
      const yards = records.reduce((sum, r) => sum + (r.totalYards ?? r.points ?? 0), 0);
      return {
        season,
        rating: Number(rating.toFixed(2)),
        goalsPer90: Number(yards.toFixed(0)),
        xGPer90: 0,
        minutes,
        appearances,
      };
    }

    const goals = records.reduce((sum, r) => sum + r.goals, 0);
    const xG = records.reduce((sum, r) => sum + r.xG, 0);

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
