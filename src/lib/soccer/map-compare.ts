/** Seasons both players actually have tracked shots for, newest first. */
export function sharedTrackedSeasons(a: number[], b: number[]): number[] {
  const other = new Set(b);
  return [...new Set(a.filter((season) => other.has(season)))].sort((left, right) => right - left);
}

export type ZoneDeltaWinner = "a" | "b" | "tie" | "hidden";

/**
 * On-target rate gap. A null rate (under 5 attempts) stays hidden — no invented edge.
 * Positive delta means player A is higher.
 */
export function zoneOnTargetDelta(
  aPct: number | null,
  bPct: number | null
): { winner: ZoneDeltaWinner; delta: number | null } {
  if (aPct == null || bPct == null) return { winner: "hidden", delta: null };
  const delta = Math.round((aPct - bPct) * 10) / 10;
  if (delta === 0) return { winner: "tie", delta: 0 };
  return { winner: delta > 0 ? "a" : "b", delta };
}
