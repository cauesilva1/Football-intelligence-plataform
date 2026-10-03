/** Per-stage time budget for the soccer cron (function limit is 300s). */
export const SOCCER_CRON_STAGE_BUDGET = {
  /** Scoreboards + ESPN boxscores run first and must never be starved by fixtures. */
  boxscoresUntilMs: 150_000,
  /** Fixture catalogue sync gets whatever is left until this point. */
  fixturesUntilMs: 200_000,
  /** Paid enrichment is only started before this point (unchanged from the original cron). */
  enrichmentStartsBeforeMs: 240_000,
} as const;

export function deadlineFrom(startedAt: number, untilMs: number): number {
  return startedAt + untilMs;
}

export function isPastDeadline(deadlineAt: number | undefined, now = Date.now()): boolean {
  return deadlineAt != null && now >= deadlineAt;
}

/**
 * Least recently synced competitions first, so a time-boxed fixtures stage rotates through
 * all leagues across days instead of always starting with the same ones.
 * Leagues never synced (no entry) come first; ties keep the configured order.
 */
export function orderBySyncStaleness<T extends { espnSlug: string }>(
  leagues: T[],
  lastSyncedBySlug: ReadonlyMap<string, Date>
): T[] {
  return leagues
    .map((league, index) => ({
      league,
      index,
      at: lastSyncedBySlug.get(league.espnSlug)?.getTime() ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((a, b) => (a.at === b.at ? a.index - b.index : a.at < b.at ? -1 : 1))
    .map((entry) => entry.league);
}

/** Take one item from each group in turn so a time-boxed run progresses every league. */
export function interleaveRoundRobin<T>(groups: ReadonlyArray<ReadonlyArray<T>>): T[] {
  const out: T[] = [];
  const longest = groups.reduce((max, g) => Math.max(max, g.length), 0);
  for (let i = 0; i < longest; i += 1) {
    for (const group of groups) {
      if (i < group.length) out.push(group[i]);
    }
  }
  return out;
}
