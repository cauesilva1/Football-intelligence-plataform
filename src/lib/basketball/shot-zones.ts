/**
 * NBA shot zones on the ESPN court.
 *
 * Verified against the summary payload for event 401898388 (2026-10-05):
 * `plays[].coordinate` is in feet, the rim sits near (x=25, y=0), and the
 * distance from that point matches the foot distance in the play text
 * (a 36-foot shot landed ~36 ft away; a 1-foot layup landed at y≈1).
 * Free throws are shooting plays with pointsAttempted=1 and a sentinel
 * coordinate near -2e9 — they are not court shots.
 *
 * Lane and arc use NBA dimensions with y measured from the rim, because
 * ESPN collapses the 5.25 ft baseline-to-rim offset into y=0:
 * restricted area 4 ft, lane 16 ft wide, free-throw line 13.75 ft from the
 * rim, corner line 22 ft from the rim, arc 23.75 ft.
 */

export const BASKETBALL_SHOT_ZONES = [
  "restricted_area",
  "paint",
  "mid_range",
  "corner_3",
  "above_the_break_3",
] as const;

export type BasketballShotZone = (typeof BASKETBALL_SHOT_ZONES)[number];

export const ZONE_LABELS: Record<BasketballShotZone, string> = {
  restricted_area: "Restricted area",
  paint: "Paint",
  mid_range: "Mid-range",
  corner_3: "Corner 3",
  above_the_break_3: "Above the break 3",
};

/** Below this, a zone (and the overall line) must not publish a percentage. */
export const MIN_ZONE_ATTEMPTS_FOR_FG = 5;

export const BASKET_X_FT = 25;
export const RESTRICTED_RADIUS_FT = 4;
export const PAINT_HALF_WIDTH_FT = 8;
export const FREE_THROW_DISTANCE_FROM_RIM_FT = 13.75;
export const THREE_POINT_RADIUS_FT = 23.75;
export const CORNER_THREE_DISTANCE_FT = 22;

/** Where the straight corner meets the arc, in feet from the rim. */
export const CORNER_BREAK_Y_FT = Math.sqrt(
  THREE_POINT_RADIUS_FT ** 2 - CORNER_THREE_DISTANCE_FT ** 2
);

const COURT_X_LIMIT_FT = 60;
const COURT_Y_LIMIT_FT = 94;

export function isBasketballShotZone(value: string): value is BasketballShotZone {
  return (BASKETBALL_SHOT_ZONES as readonly string[]).includes(value);
}

/** Rejects non-finite values and the free-throw sentinel (~-2e9). */
export function isPlausibleCourtCoordinate(x: number, y: number): boolean {
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Math.abs(x) <= COURT_X_LIMIT_FT &&
    Math.abs(y) <= COURT_Y_LIMIT_FT
  );
}

/**
 * Classify one field-goal attempt.
 * `pointsAttempted` is the provider's 2 vs 3 flag — geometry only splits
 * zones inside that bucket. Returns null when the point cannot be placed.
 */
export function classifyBasketballZone(
  x: number,
  y: number,
  pointsAttempted: number
): BasketballShotZone | null {
  if (!isPlausibleCourtCoordinate(x, y)) return null;
  if (pointsAttempted !== 2 && pointsAttempted !== 3) return null;

  if (pointsAttempted === 3) {
    return y <= CORNER_BREAK_Y_FT ? "corner_3" : "above_the_break_3";
  }

  const distanceFromRim = Math.hypot(x - BASKET_X_FT, y);
  if (distanceFromRim <= RESTRICTED_RADIUS_FT) return "restricted_area";

  const inLane =
    x >= BASKET_X_FT - PAINT_HALF_WIDTH_FT &&
    x <= BASKET_X_FT + PAINT_HALF_WIDTH_FT &&
    y <= FREE_THROW_DISTANCE_FROM_RIM_FT &&
    y >= -4;
  if (inLane) return "paint";

  return "mid_range";
}

/** Null means "do not render a percentage". */
export function fgPctOrNull(made: number, attempts: number): number | null {
  if (attempts < MIN_ZONE_ATTEMPTS_FOR_FG || made < 0 || made > attempts) return null;
  return Math.round((made / attempts) * 1000) / 10;
}

const GREY_FILL = "#d4d4d8";

/** Higher field-goal percentage → stronger green. Small samples stay grey. */
export function zoneEfficiencyFill(
  fgPct: number | null,
  attempts: number
): { fill: string; ink: string } {
  if (fgPct == null || attempts < MIN_ZONE_ATTEMPTS_FOR_FG) {
    return { fill: GREY_FILL, ink: "#334155" };
  }
  const t = Math.min(1, Math.max(0, (fgPct - 30) / 40));
  const lightness = 84 - t * 48;
  const saturation = 32 + t * 48;
  return {
    fill: `hsl(152 ${saturation}% ${lightness}%)`,
    ink: lightness < 58 ? "#f8fafc" : "#0f172a",
  };
}
