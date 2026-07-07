/** Normalizes raw match totals to per-90-minute rates (industry standard). */
export function per90(value: number, minutesPlayed: number): number {
  if (!minutesPlayed || minutesPlayed <= 0) return 0;
  return Number(((value / minutesPlayed) * 90).toFixed(2));
}

export interface RawStatInput {
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  dribblesCompleted: number;
  tacklesWon: number;
  interceptions: number;
}

export function computePer90Metrics(raw: RawStatInput) {
  const { minutesPlayed } = raw;
  return {
    goals: per90(raw.goals, minutesPlayed),
    assists: per90(raw.assists, minutesPlayed),
    shots: per90(raw.shots, minutesPlayed),
    keyPasses: per90(raw.keyPasses, minutesPlayed),
    dribbles: per90(raw.dribblesCompleted, minutesPlayed),
    tackles: per90(raw.tacklesWon, minutesPlayed),
    interceptions: per90(raw.interceptions, minutesPlayed),
  };
}

/** Aggregates multiple stint records (e.g. mid-season transfer) into one season total. */
export function aggregateStatistics<T extends RawStatInput & { appearances: number; rating: number }>(
  records: T[]
): T & { rating: number } {
  if (records.length === 0) throw new Error("Cannot aggregate empty statistics");

  const totals = records.reduce(
    (acc, r) => ({
      appearances: acc.appearances + r.appearances,
      minutesPlayed: acc.minutesPlayed + r.minutesPlayed,
      goals: acc.goals + r.goals,
      assists: acc.assists + r.assists,
      shots: acc.shots + r.shots,
      keyPasses: acc.keyPasses + r.keyPasses,
      dribblesCompleted: acc.dribblesCompleted + r.dribblesCompleted,
      tacklesWon: acc.tacklesWon + r.tacklesWon,
      interceptions: acc.interceptions + r.interceptions,
      ratingSum: acc.ratingSum + r.rating * r.appearances,
    }),
    {
      appearances: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      shots: 0,
      keyPasses: 0,
      dribblesCompleted: 0,
      tacklesWon: 0,
      interceptions: 0,
      ratingSum: 0,
    }
  );

  const base = records[records.length - 1];
  const weightedRating =
    totals.appearances > 0 ? Number((totals.ratingSum / totals.appearances).toFixed(2)) : base.rating;

  return {
    ...base,
    ...totals,
    rating: weightedRating,
  };
}
