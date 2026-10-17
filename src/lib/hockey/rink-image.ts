/**
 * Background for the NHL shot chart: `public/maps/hockey-rink.png` (1024×572).
 *
 * The file has a dark margin around the ice. The image edges are not the boards.
 * Ice bounds were measured by scanning pixels with R>200, G>210, B>215
 * (the light ice; the margin outside the boards is darker):
 *   end boards x = 33 and x = 990 inclusive, on a straight row (y = 240)
 *   side boards y = 58 and y = 512 inclusive, on a straight column (x = 300)
 * `right` and `bottom` are exclusive, so x = -100 maps to pixel 33 and
 * x = 100 maps to the far side of pixel 990.
 *
 * NHL x is along the rink (-100..100). NHL y is across it (-42.5..42.5),
 * positive toward the top of the image. The same linear map is the SVG
 * transform applied to zone shapes drawn in rink feet.
 */
export const HOCKEY_RINK_IMAGE = { width: 1024, height: 572 } as const;

export const HOCKEY_RINK_SURFACE = {
  left: 33,
  top: 58,
  right: 991,
  bottom: 513,
} as const;

const SURFACE_WIDTH = HOCKEY_RINK_SURFACE.right - HOCKEY_RINK_SURFACE.left;
const SURFACE_HEIGHT = HOCKEY_RINK_SURFACE.bottom - HOCKEY_RINK_SURFACE.top;

/** Goal-dot radius in image pixels, matching the old 1.7 ft marker on the rink length. */
export const HOCKEY_MARKER_RADIUS = 1.7 * (SURFACE_WIDTH / 200);

/** Feet → image pixels. One scale per axis, over the ice only. */
export function hockeyImagePoint(x: number, y: number): { x: number; y: number } {
  return {
    x: HOCKEY_RINK_SURFACE.left + ((x + 100) / 200) * SURFACE_WIDTH,
    y: HOCKEY_RINK_SURFACE.top + ((42.5 - y) / 85) * SURFACE_HEIGHT,
  };
}

/** Rink-foot drawing (svg y = -nhl y) → image pixels. Zones stay in feet under this. */
export function hockeyRinkFeetTransform(): string {
  const sx = SURFACE_WIDTH / 200;
  const sy = SURFACE_HEIGHT / 85;
  const tx = HOCKEY_RINK_SURFACE.left + SURFACE_WIDTH / 2;
  const ty = HOCKEY_RINK_SURFACE.top + SURFACE_HEIGHT / 2;
  return `translate(${tx} ${ty}) scale(${sx} ${sy})`;
}

/** Full sheet, or the attacking half (positive x, the right-hand net). */
export function hockeyRinkViewBox(view: "offense" | "full"): string {
  const { width, height } = HOCKEY_RINK_IMAGE;
  if (view === "full") return `0 0 ${width} ${height}`;
  const mid = HOCKEY_RINK_SURFACE.left + SURFACE_WIDTH / 2;
  return `${mid} 0 ${width - mid} ${height}`;
}
