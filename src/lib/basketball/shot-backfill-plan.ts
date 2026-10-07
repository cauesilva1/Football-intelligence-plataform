/** Hard cap so one cron invocation cannot walk the whole season. */
export const NBA_SHOT_CHART_MAX_GAMES_PER_RUN = 10;
/** Don't start a summary fetch unless at least this much budget remains. */
export const NBA_SHOT_CHART_MIN_GAME_MS = 20_000;

export function selectShotBackfillBatch<T>(
  pending: readonly T[],
  options: { maxGames: number; remainingMs: number; minGameMs: number }
): { batch: T[]; stoppedForTime: boolean } {
  const maxGames = Math.max(0, Math.floor(options.maxGames));
  if (pending.length === 0 || maxGames === 0) {
    return { batch: [], stoppedForTime: false };
  }

  const affordable =
    options.minGameMs > 0 ? Math.floor(options.remainingMs / options.minGameMs) : 0;
  if (affordable <= 0) {
    return { batch: [], stoppedForTime: true };
  }

  const take = Math.min(pending.length, maxGames, affordable);
  return {
    batch: pending.slice(0, take),
    stoppedForTime: take < pending.length && affordable < maxGames,
  };
}
