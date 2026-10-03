export type BoxscoreCacheJson = {
  playersProcessed?: number;
  statsUpserted?: number;
  failed?: number;
  complete?: boolean;
};

function asRecord(json: unknown): BoxscoreCacheJson | null {
  return json && typeof json === "object" ? (json as BoxscoreCacheJson) : null;
}

/**
 * A boxscore may be marked done only if at least one appearance row was written and no
 * player write failed. Anything else must stay reprocessable.
 */
export function shouldCacheBoxscore(result: { statsUpserted: number; failed: number }): boolean {
  return result.statsUpserted > 0 && result.failed === 0;
}

/**
 * Whether a systemCache entry means "this match is fully ingested".
 * Entries written before the `complete` flag existed are judged by their counters, so
 * partially written matches (rows < athletes) are picked up again.
 */
export function isBoxscoreCacheComplete(json: unknown): boolean {
  const entry = asRecord(json);
  if (!entry) return false;
  if (typeof entry.complete === "boolean") return entry.complete;

  const upserted = entry.statsUpserted ?? 0;
  const processed = entry.playersProcessed ?? 0;
  return upserted > 0 && upserted >= processed;
}
