import { PITCH_HEIGHT, PITCH_WIDTH } from "@/lib/soccer/pitch-geometry";

/**
 * Background for the soccer shot chart: `public/maps/soccer-pitch.png` (1024×572).
 *
 * The pitch is drawn longways inside a dark margin. White-line centers, measured
 * against the grass:
 *   goal lines x = 120 and x = 903 (410 px tall, the full width)
 *   sidelines y = 54 and y = 517 (full length)
 *   center line x = 511, which is the midpoint of the two goal lines
 * The penalty lines sit 122 px in front of each goal and the six-yard lines 40 px,
 * matching 16.5 m and 5.5 m on the 783 px between the goals.
 *
 * The chart is the attacking half only, goal at the top. The right-hand goal is
 * that goal. Display space rotates the file the same way as the basketball court:
 *   displayX = imageY
 *   displayY = imageWidth - imageX
 * so the right goal line lands near the top and the center line at the bottom.
 */
export const SOCCER_PITCH_IMAGE = { width: 1024, height: 572 } as const;

export const SOCCER_PITCH_SURFACE = {
  leftGoal: 120,
  rightGoal: 903,
  top: 54,
  bottom: 517,
} as const;

const HALF_LENGTH = (SOCCER_PITCH_SURFACE.rightGoal - SOCCER_PITCH_SURFACE.leftGoal) / 2;
const PITCH_WIDTH_PX = SOCCER_PITCH_SURFACE.bottom - SOCCER_PITCH_SURFACE.top;

/** Attacking-half SVG point (goal at y = 0, 10 px per meter) → display pixels. */
export function soccerSvgToImage(svgX: number, svgY: number): { x: number; y: number } {
  return {
    x: SOCCER_PITCH_SURFACE.top + svgX * (PITCH_WIDTH_PX / PITCH_WIDTH),
    y:
      SOCCER_PITCH_IMAGE.width -
      SOCCER_PITCH_SURFACE.rightGoal +
      svgY * (HALF_LENGTH / PITCH_HEIGHT),
  };
}

/**
 * Stored pitch percent. x = 100 is the goal line, y = 0 is one sideline.
 * Only the attacking half (x ≥ 50) is on the chart.
 */
export function soccerImagePoint(x: number, y: number): { x: number; y: number } {
  const imageX =
    SOCCER_PITCH_SURFACE.leftGoal +
    HALF_LENGTH +
    ((x - 50) / 50) * HALF_LENGTH;
  const imageY = SOCCER_PITCH_SURFACE.top + (y / 100) * PITCH_WIDTH_PX;
  return { x: imageY, y: SOCCER_PITCH_IMAGE.width - imageX };
}

/** Puts the landscape file into display space (right goal toward the top). */
export function soccerPitchImageTransform(): string {
  return `translate(0 ${SOCCER_PITCH_IMAGE.width}) rotate(-90)`;
}

/** Half-pitch drawing → display pixels. Same map as `soccerSvgToImage`. */
export function soccerPitchFeetTransform(): string {
  const tx = SOCCER_PITCH_SURFACE.top;
  const ty = SOCCER_PITCH_IMAGE.width - SOCCER_PITCH_SURFACE.rightGoal;
  const sx = PITCH_WIDTH_PX / PITCH_WIDTH;
  const sy = HALF_LENGTH / PITCH_HEIGHT;
  return `translate(${tx} ${ty}) scale(${sx} ${sy})`;
}

/** Attacking half, including the goal net in the dark margin above the goal line. */
export function soccerPitchViewBox(): string {
  const displayWidth = SOCCER_PITCH_IMAGE.height;
  const center =
    SOCCER_PITCH_IMAGE.width -
    (SOCCER_PITCH_SURFACE.leftGoal + SOCCER_PITCH_SURFACE.rightGoal) / 2;
  return `0 0 ${displayWidth} ${Math.round(center + 8)}`;
}
