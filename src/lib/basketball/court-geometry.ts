import {
  BASKET_X_FT,
  CORNER_THREE_DISTANCE_FT,
  RESTRICTED_RADIUS_FT,
  THREE_POINT_RADIUS_FT,
  type BasketballShotZone,
} from "@/lib/basketball/shot-zones";

/**
 * Regulation NBA court, offensive baseline at the bottom, defensive baseline at the top.
 * Stored coordinates use ESPN feet with the rim being attacked at y=0. The rim is
 * 5.25 ft from that baseline. Defensive events are in the opponent's attacking
 * frame, so they are rotated 180° onto the far half.
 */
const SCALE = 10;
export const COURT_WIDTH_FT = 50;
export const FULL_COURT_FT = 94;
export const HALF_COURT_FT = 47;
export const RIM_FROM_BASELINE_FT = 5.25;
export const PAINT_LENGTH_FT = 19;
export const FREE_THROW_RADIUS_FT = 6;
export const BACKBOARD_WIDTH_FT = 6;
export const BACKBOARD_FROM_BASELINE_FT = 4;
export const RIM_RADIUS_FT = 0.75;
export const CENTER_CIRCLE_RADIUS_FT = 6;

const leftCornerX = BASKET_X_FT - CORNER_THREE_DISTANCE_FT;
const rightCornerX = BASKET_X_FT + CORNER_THREE_DISTANCE_FT;

function px(feet: number): number {
  return Math.round(feet * SCALE * 100) / 100;
}

/** Sideline feet → SVG x. Left sideline is 0. */
export function courtX(feetFromLeftSideline: number): number {
  return px(feetFromLeftSideline);
}

/** Feet from the offensive baseline → SVG y. Offensive baseline is the bottom edge. */
export function courtY(feetFromOffensiveBaseline: number): number {
  return px(FULL_COURT_FT - feetFromOffensiveBaseline);
}

/** ESPN y (feet from the offensive rim, toward half court) → feet from the offensive baseline. */
export function shotFeetFromBaseline(yFromRim: number): number {
  return yFromRim + RIM_FROM_BASELINE_FT;
}

export function shotMarkerPoint(x: number, yFromRim: number): { x: number; y: number } {
  return { x: courtX(x), y: courtY(shotFeetFromBaseline(yFromRim)) };
}

/**
 * 180° rotation onto the full court. ESPN records the possession with the
 * attacked basket at (25, 0); for a steal or block that basket is the far one.
 */
export function mirrorDefensiveX(xFromLeftSideline: number): number {
  return COURT_WIDTH_FT - xFromLeftSideline;
}

export function defensiveFeetFromOffensiveBaseline(yFromAttackedRim: number): number {
  return FULL_COURT_FT - (yFromAttackedRim + RIM_FROM_BASELINE_FT);
}

export function defensiveMarkerPoint(x: number, yFromAttackedRim: number): { x: number; y: number } {
  return {
    x: courtX(mirrorDefensiveX(x)),
    y: courtY(defensiveFeetFromOffensiveBaseline(yFromAttackedRim)),
  };
}

/** Where the 22 ft corner meets the 23'9" arc, measured from the baseline. */
export const CORNER_BREAK_FROM_BASELINE_FT =
  RIM_FROM_BASELINE_FT + Math.sqrt(THREE_POINT_RADIUS_FT ** 2 - CORNER_THREE_DISTANCE_FT ** 2);

const PAD = 20;

export const COURT_VIEW = {
  width: px(COURT_WIDTH_FT),
  height: px(FULL_COURT_FT),
  viewBox: `${-PAD} ${-PAD} ${px(COURT_WIDTH_FT) + PAD * 2} ${px(FULL_COURT_FT) + PAD * 2}`,
};

function arcTo(radiusFt: number, xFt: number, yFt: number, sweep: 0 | 1): string {
  const radius = px(radiusFt);
  return `A ${radius} ${radius} 0 0 ${sweep} ${courtX(xFt)} ${courtY(yFt)}`;
}

const breakY = CORNER_BREAK_FROM_BASELINE_FT;
const paintLeft = BASKET_X_FT - 8;
const paintRight = BASKET_X_FT + 8;
const raLeft = BASKET_X_FT - RESTRICTED_RADIUS_FT;
const raRight = BASKET_X_FT + RESTRICTED_RADIUS_FT;
const far = (feetFromOffensiveBaseline: number) => FULL_COURT_FT - feetFromOffensiveBaseline;

/** Semicircle in front of the rim. Sweep 1 bulges toward half court. */
function restrictedArc(sweep: 0 | 1): string {
  return `${arcTo(RESTRICTED_RADIUS_FT, sweep === 1 ? raRight : raLeft, RIM_FROM_BASELINE_FT, sweep)}`;
}

/**
 * Non-overlapping hit regions. Paint and mid-range use evenodd holes so a click
 * lands on the zone you see, not on a shape stacked underneath.
 */
export function courtZonePath(zone: BasketballShotZone): string {
  switch (zone) {
    case "restricted_area":
      return `M ${courtX(raLeft)} ${courtY(RIM_FROM_BASELINE_FT)} ${restrictedArc(1)} Z`;
    case "paint":
      return [
        `M ${courtX(paintLeft)} ${courtY(0)}`,
        `L ${courtX(paintRight)} ${courtY(0)}`,
        `L ${courtX(paintRight)} ${courtY(PAINT_LENGTH_FT)}`,
        `L ${courtX(paintLeft)} ${courtY(PAINT_LENGTH_FT)} Z`,
        `M ${courtX(raLeft)} ${courtY(RIM_FROM_BASELINE_FT)} ${restrictedArc(1)} Z`,
      ].join(" ");
    case "mid_range":
      return [
        `M ${courtX(leftCornerX)} ${courtY(0)}`,
        `L ${courtX(leftCornerX)} ${courtY(breakY)}`,
        arcTo(THREE_POINT_RADIUS_FT, rightCornerX, breakY, 1),
        `L ${courtX(rightCornerX)} ${courtY(0)} Z`,
        `M ${courtX(paintLeft)} ${courtY(0)}`,
        `L ${courtX(paintRight)} ${courtY(0)}`,
        `L ${courtX(paintRight)} ${courtY(PAINT_LENGTH_FT)}`,
        `L ${courtX(paintLeft)} ${courtY(PAINT_LENGTH_FT)} Z`,
      ].join(" ");
    case "corner_3":
      return [
        `M ${courtX(0)} ${courtY(0)}`,
        `L ${courtX(0)} ${courtY(breakY)}`,
        `L ${courtX(leftCornerX)} ${courtY(breakY)}`,
        `L ${courtX(leftCornerX)} ${courtY(0)} Z`,
        `M ${courtX(rightCornerX)} ${courtY(0)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(0)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(breakY)}`,
        `L ${courtX(rightCornerX)} ${courtY(breakY)} Z`,
      ].join(" ");
    case "above_the_break_3":
      return [
        `M ${courtX(0)} ${courtY(HALF_COURT_FT)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(HALF_COURT_FT)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(breakY)}`,
        `L ${courtX(rightCornerX)} ${courtY(breakY)}`,
        arcTo(THREE_POINT_RADIUS_FT, leftCornerX, breakY, 0),
        `L ${courtX(0)} ${courtY(breakY)} Z`,
      ].join(" ");
  }
}

const farBreakY = far(breakY);
const farPaint = far(PAINT_LENGTH_FT);
const farRim = far(RIM_FROM_BASELINE_FT);
const farBackboard = far(BACKBOARD_FROM_BASELINE_FT);

export const COURT_LINES = {
  boundary: `M ${courtX(0)} ${courtY(0)} L ${courtX(COURT_WIDTH_FT)} ${courtY(0)} L ${courtX(COURT_WIDTH_FT)} ${courtY(FULL_COURT_FT)} L ${courtX(0)} ${courtY(FULL_COURT_FT)} Z`,
  halfCourt: `M ${courtX(0)} ${courtY(HALF_COURT_FT)} L ${courtX(COURT_WIDTH_FT)} ${courtY(HALF_COURT_FT)}`,
  paint: `M ${courtX(paintLeft)} ${courtY(0)} L ${courtX(paintLeft)} ${courtY(PAINT_LENGTH_FT)} L ${courtX(paintRight)} ${courtY(PAINT_LENGTH_FT)} L ${courtX(paintRight)} ${courtY(0)}`,
  paintFar: `M ${courtX(paintLeft)} ${courtY(FULL_COURT_FT)} L ${courtX(paintLeft)} ${courtY(farPaint)} L ${courtX(paintRight)} ${courtY(farPaint)} L ${courtX(paintRight)} ${courtY(FULL_COURT_FT)}`,
  freeThrowTop: `M ${courtX(BASKET_X_FT - FREE_THROW_RADIUS_FT)} ${courtY(PAINT_LENGTH_FT)} ${arcTo(FREE_THROW_RADIUS_FT, BASKET_X_FT + FREE_THROW_RADIUS_FT, PAINT_LENGTH_FT, 1)}`,
  freeThrowBottom: `M ${courtX(BASKET_X_FT - FREE_THROW_RADIUS_FT)} ${courtY(PAINT_LENGTH_FT)} ${arcTo(FREE_THROW_RADIUS_FT, BASKET_X_FT + FREE_THROW_RADIUS_FT, PAINT_LENGTH_FT, 0)}`,
  freeThrowFar: `M ${courtX(BASKET_X_FT - FREE_THROW_RADIUS_FT)} ${courtY(farPaint)} ${arcTo(FREE_THROW_RADIUS_FT, BASKET_X_FT + FREE_THROW_RADIUS_FT, farPaint, 0)}`,
  freeThrowFarDashed: `M ${courtX(BASKET_X_FT - FREE_THROW_RADIUS_FT)} ${courtY(farPaint)} ${arcTo(FREE_THROW_RADIUS_FT, BASKET_X_FT + FREE_THROW_RADIUS_FT, farPaint, 1)}`,
  restricted: `M ${courtX(raLeft)} ${courtY(RIM_FROM_BASELINE_FT)} ${restrictedArc(1)}`,
  restrictedFar: `M ${courtX(raLeft)} ${courtY(farRim)} ${arcTo(RESTRICTED_RADIUS_FT, raRight, farRim, 0)}`,
  three: `M ${courtX(leftCornerX)} ${courtY(0)} L ${courtX(leftCornerX)} ${courtY(breakY)} ${arcTo(THREE_POINT_RADIUS_FT, rightCornerX, breakY, 1)} L ${courtX(rightCornerX)} ${courtY(0)}`,
  threeFar: `M ${courtX(leftCornerX)} ${courtY(FULL_COURT_FT)} L ${courtX(leftCornerX)} ${courtY(farBreakY)} ${arcTo(THREE_POINT_RADIUS_FT, rightCornerX, farBreakY, 0)} L ${courtX(rightCornerX)} ${courtY(FULL_COURT_FT)}`,
  backboard: `M ${courtX(BASKET_X_FT - BACKBOARD_WIDTH_FT / 2)} ${courtY(BACKBOARD_FROM_BASELINE_FT)} L ${courtX(BASKET_X_FT + BACKBOARD_WIDTH_FT / 2)} ${courtY(BACKBOARD_FROM_BASELINE_FT)}`,
  backboardFar: `M ${courtX(BASKET_X_FT - BACKBOARD_WIDTH_FT / 2)} ${courtY(farBackboard)} L ${courtX(BASKET_X_FT + BACKBOARD_WIDTH_FT / 2)} ${courtY(farBackboard)}`,
  connector: `M ${courtX(BASKET_X_FT)} ${courtY(BACKBOARD_FROM_BASELINE_FT)} L ${courtX(BASKET_X_FT)} ${courtY(RIM_FROM_BASELINE_FT)}`,
  connectorFar: `M ${courtX(BASKET_X_FT)} ${courtY(farBackboard)} L ${courtX(BASKET_X_FT)} ${courtY(farRim)}`,
};

export const CENTER = {
  cx: courtX(BASKET_X_FT),
  cy: courtY(HALF_COURT_FT),
  r: px(CENTER_CIRCLE_RADIUS_FT),
};

export const RIM = {
  cx: courtX(BASKET_X_FT),
  cy: courtY(RIM_FROM_BASELINE_FT),
  r: px(RIM_RADIUS_FT),
};

export const RIM_FAR = {
  cx: courtX(BASKET_X_FT),
  cy: courtY(farRim),
  r: px(RIM_RADIUS_FT),
};
