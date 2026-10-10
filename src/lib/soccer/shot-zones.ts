/**
 * Attacking zones on the ESPN soccer pitch.
 *
 * `fieldPositionX/Y` are 0–100 (length × width), verified on MLS event 761844
 * (2026-09-27): a shot aimed at the right goal has fieldPosition2X near 100.
 * Stored points are rotated so that goal is always x = 100.
 *
 * Box sizes are 105 × 68 m scaled onto that percent space. The penalty arc is
 * a 9.15 m circle, so it is an ellipse when x and y are both 0–100.
 */

export const SOCCER_SHOT_ZONES = [
  "six_yard",
  "penalty_area",
  "arch",
  "left_side",
  "right_side",
  "outside_box",
] as const;

export type SoccerShotZone = (typeof SOCCER_SHOT_ZONES)[number];

export const SOCCER_ZONE_LABELS: Record<SoccerShotZone, string> = {
  six_yard: "Six-yard box",
  penalty_area: "Penalty area",
  arch: "Arch",
  left_side: "Left side",
  right_side: "Right side",
  outside_box: "Outside the box",
};

export const MIN_ZONE_ATTEMPTS_FOR_RATE = 5;

const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;

function lengthPercent(meters: number): number {
  return (meters / PITCH_LENGTH_M) * 100;
}

function widthPercent(meters: number): number {
  return (meters / PITCH_WIDTH_M) * 100;
}

/** Goal line of the normalized attack is x = 100. */
export const SIX_YARD_X = 100 - lengthPercent(5.5);
export const PENALTY_BOX_X = 100 - lengthPercent(16.5);
export const PENALTY_SPOT_X = 100 - lengthPercent(11);
export const ARC_RADIUS_X = lengthPercent(9.15);
export const ARC_RADIUS_Y = widthPercent(9.15);

const PENALTY_HALF_WIDTH = widthPercent(40.32) / 2;
const SIX_YARD_HALF_WIDTH = widthPercent(18.32) / 2;

export const PENALTY_Y_MIN = 50 - PENALTY_HALF_WIDTH;
export const PENALTY_Y_MAX = 50 + PENALTY_HALF_WIDTH;
export const SIX_YARD_Y_MIN = 50 - SIX_YARD_HALF_WIDTH;
export const SIX_YARD_Y_MAX = 50 + SIX_YARD_HALF_WIDTH;

export function isSoccerShotZone(value: string): value is SoccerShotZone {
  return (SOCCER_SHOT_ZONES as readonly string[]).includes(value);
}

export function isPlausiblePitchCoordinate(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

/** Rotate a shot so it attacks the goal at x = 100. `targetX` is fieldPosition2X. */
export function normalizeAttackingPoint(
  x: number,
  y: number,
  targetX: number | null
): { x: number; y: number } | null {
  if (!isPlausiblePitchCoordinate(x, y)) return null;
  const attacksLowGoal = targetX != null && Number.isFinite(targetX) ? targetX < 50 : x < 50;
  if (!attacksLowGoal) return { x, y };
  return { x: 100 - x, y: 100 - y };
}

function inRect(x: number, y: number, minX: number, minY: number, maxY: number): boolean {
  return x >= minX && x <= 100 && y >= minY && y <= maxY;
}

function inPenaltyArc(x: number, y: number): boolean {
  const dx = (x - PENALTY_SPOT_X) / ARC_RADIUS_X;
  const dy = (y - 50) / ARC_RADIUS_Y;
  return dx * dx + dy * dy <= 1 && x < PENALTY_BOX_X;
}

export function classifySoccerZone(x: number, y: number): SoccerShotZone | null {
  if (!isPlausiblePitchCoordinate(x, y)) return null;
  if (inRect(x, y, SIX_YARD_X, SIX_YARD_Y_MIN, SIX_YARD_Y_MAX)) return "six_yard";
  if (inRect(x, y, PENALTY_BOX_X, PENALTY_Y_MIN, PENALTY_Y_MAX)) return "penalty_area";
  if (inPenaltyArc(x, y)) return "arch";
  if (y < PENALTY_Y_MIN) return "left_side";
  if (y > PENALTY_Y_MAX) return "right_side";
  return "outside_box";
}

/** Null means "do not render a percentage". */
export function conversionPctOrNull(converted: number, attempts: number): number | null {
  if (attempts < MIN_ZONE_ATTEMPTS_FOR_RATE || converted < 0 || converted > attempts) return null;
  return Math.round((converted / attempts) * 1000) / 10;
}

const GREY_FILL = "#d4d4d8";

export function zoneConversionFill(
  pct: number | null,
  attempts: number
): { fill: string; ink: string } {
  if (pct == null || attempts < MIN_ZONE_ATTEMPTS_FOR_RATE) {
    return { fill: GREY_FILL, ink: "#334155" };
  }
  const t = Math.min(1, Math.max(0, (pct - 20) / 50));
  const lightness = 84 - t * 48;
  const saturation = 32 + t * 48;
  return {
    fill: `hsl(152 ${saturation}% ${lightness}%)`,
    ink: lightness < 58 ? "#f8fafc" : "#0f172a",
  };
}
