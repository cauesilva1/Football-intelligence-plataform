/**
 * Background for the NBA shot chart: `public/maps/basketball-court.png` (1024×572).
 *
 * The court is drawn longways (baselines left and right) inside a dark margin.
 * Boundary-line pixels vs that margin, measured on the center row and center column:
 *   baselines occupy x = 76..78 and x = 945..947
 *   sidelines occupy y = 61..63 and y = 508..510
 * The playing surface is the outer edge of those lines. `right` and `bottom`
 * are exclusive (76..948 along the length, 61..511 along the width).
 *
 * Image x runs from the left basket to the right basket. Image y runs from
 * the top sideline to the bottom sideline. Display space rotates the file so
 * the left basket is the offensive baseline at the bottom, matching the
 * existing court drawing (offense down, defense up):
 *   displayX = imageY
 *   displayY = imageWidth - imageX
 *
 * Stored shots use ESPN feet: x from the left sideline, y from the offensive rim.
 * Court SVG units are 10 px per foot with the offensive baseline at the bottom.
 * `basketballSvgToImage` is the linear map those units use, so zone paths drawn
 * in court feet land on the wood.
 */
export const BASKETBALL_COURT_IMAGE = { width: 1024, height: 572 } as const;

export const BASKETBALL_COURT_SURFACE = {
  left: 76,
  top: 61,
  right: 948,
  bottom: 511,
} as const;

const LENGTH = BASKETBALL_COURT_SURFACE.right - BASKETBALL_COURT_SURFACE.left;
const WIDTH = BASKETBALL_COURT_SURFACE.bottom - BASKETBALL_COURT_SURFACE.top;

/** Court-feet SVG point (10 px per foot, offense at the bottom) → display pixels. */
export function basketballSvgToImage(svgX: number, svgY: number): { x: number; y: number } {
  return {
    x: BASKETBALL_COURT_SURFACE.top + svgX * (WIDTH / 500),
    y: BASKETBALL_COURT_IMAGE.width - BASKETBALL_COURT_SURFACE.right + svgY * (LENGTH / 940),
  };
}

/** Feet from the left sideline and from the offensive baseline → display pixels. */
export function basketballImagePoint(
  feetFromLeftSideline: number,
  feetFromOffensiveBaseline: number
): { x: number; y: number } {
  const imageX =
    BASKETBALL_COURT_SURFACE.left + (feetFromOffensiveBaseline / 94) * LENGTH;
  const imageY = BASKETBALL_COURT_SURFACE.top + (feetFromLeftSideline / 50) * WIDTH;
  return {
    x: imageY,
    y: BASKETBALL_COURT_IMAGE.width - imageX,
  };
}

/** Puts the landscape file into display space (left basket at the bottom). */
export function basketballCourtImageTransform(): string {
  return `translate(0 ${BASKETBALL_COURT_IMAGE.width}) rotate(-90)`;
}

/** Court-feet drawing → display pixels. Same map as `basketballSvgToImage`. */
export function basketballCourtFeetTransform(): string {
  const tx = BASKETBALL_COURT_SURFACE.top;
  const ty = BASKETBALL_COURT_IMAGE.width - BASKETBALL_COURT_SURFACE.right;
  const sx = WIDTH / 500;
  const sy = LENGTH / 940;
  return `translate(${tx} ${ty}) scale(${sx} ${sy})`;
}

/** Full floor, or one half split on the center line between the two baselines. */
export function basketballCourtViewBox(view: "offense" | "defense" | "full"): string {
  const displayWidth = BASKETBALL_COURT_IMAGE.height;
  const displayHeight = BASKETBALL_COURT_IMAGE.width;
  if (view === "full") return `0 0 ${displayWidth} ${displayHeight}`;
  const half = displayHeight / 2;
  if (view === "defense") return `0 0 ${displayWidth} ${half}`;
  return `0 ${half} ${displayWidth} ${half}`;
}
