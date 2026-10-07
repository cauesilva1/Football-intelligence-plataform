import {
  BASKET_X_FT,
  CORNER_BREAK_Y_FT,
  CORNER_THREE_DISTANCE_FT,
  FREE_THROW_DISTANCE_FROM_RIM_FT,
  RESTRICTED_RADIUS_FT,
  THREE_POINT_RADIUS_FT,
  type BasketballShotZone,
} from "@/lib/basketball/shot-zones";

const SCALE = 10;
const HALF_COURT_FT = 47;
const COURT_WIDTH_FT = 50;

function px(feet: number): number {
  return Math.round(feet * SCALE * 100) / 100;
}

/** SVG y grows downward; court y grows from the rim toward half court. */
export function courtX(feet: number): number {
  return px(feet);
}

export function courtY(feetFromRim: number): number {
  return px(HALF_COURT_FT - feetFromRim);
}

export const COURT_VIEW = {
  width: px(COURT_WIDTH_FT),
  height: px(HALF_COURT_FT),
  viewBox: `-10 -8 ${px(COURT_WIDTH_FT) + 20} ${px(HALF_COURT_FT) + 28}`,
};

function arc(radiusFt: number, toXFt: number, toYFt: number, sweep: 0 | 1): string {
  const radius = px(radiusFt);
  return `A ${radius} ${radius} 0 0 ${sweep} ${courtX(toXFt)} ${courtY(toYFt)}`;
}

const leftCornerX = BASKET_X_FT - CORNER_THREE_DISTANCE_FT;
const rightCornerX = BASKET_X_FT + CORNER_THREE_DISTANCE_FT;

export function courtZonePath(zone: BasketballShotZone): string {
  const yb = CORNER_BREAK_Y_FT;
  switch (zone) {
    case "restricted_area":
      return `M ${courtX(BASKET_X_FT - RESTRICTED_RADIUS_FT)} ${courtY(0)} ${arc(
        RESTRICTED_RADIUS_FT,
        BASKET_X_FT + RESTRICTED_RADIUS_FT,
        0,
        1
      )} Z`;
    case "paint":
      return [
        `M ${courtX(BASKET_X_FT - 8)} ${courtY(0)}`,
        `L ${courtX(BASKET_X_FT + 8)} ${courtY(0)}`,
        `L ${courtX(BASKET_X_FT + 8)} ${courtY(FREE_THROW_DISTANCE_FROM_RIM_FT)}`,
        `L ${courtX(BASKET_X_FT - 8)} ${courtY(FREE_THROW_DISTANCE_FROM_RIM_FT)}`,
        "Z",
      ].join(" ");
    case "mid_range":
      return [
        `M ${courtX(leftCornerX)} ${courtY(0)}`,
        `L ${courtX(leftCornerX)} ${courtY(yb)}`,
        arc(THREE_POINT_RADIUS_FT, rightCornerX, yb, 1),
        `L ${courtX(rightCornerX)} ${courtY(0)}`,
        "Z",
      ].join(" ");
    case "corner_3":
      return [
        `M ${courtX(0)} ${courtY(0)}`,
        `L ${courtX(0)} ${courtY(yb)}`,
        `L ${courtX(leftCornerX)} ${courtY(yb)}`,
        `L ${courtX(leftCornerX)} ${courtY(0)} Z`,
        `M ${courtX(rightCornerX)} ${courtY(0)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(0)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(yb)}`,
        `L ${courtX(rightCornerX)} ${courtY(yb)} Z`,
      ].join(" ");
    case "above_the_break_3":
      return [
        `M ${courtX(0)} ${courtY(HALF_COURT_FT)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(HALF_COURT_FT)}`,
        `L ${courtX(COURT_WIDTH_FT)} ${courtY(yb)}`,
        `L ${courtX(rightCornerX)} ${courtY(yb)}`,
        arc(THREE_POINT_RADIUS_FT, leftCornerX, yb, 0),
        `L ${courtX(0)} ${courtY(yb)}`,
        "Z",
      ].join(" ");
  }
}

export function courtLinesPath(): string {
  const yb = CORNER_BREAK_Y_FT;
  const ft = FREE_THROW_DISTANCE_FROM_RIM_FT;
  return [
    `M ${courtX(0)} ${courtY(0)} L ${courtX(COURT_WIDTH_FT)} ${courtY(0)} L ${courtX(COURT_WIDTH_FT)} ${courtY(HALF_COURT_FT)} L ${courtX(0)} ${courtY(HALF_COURT_FT)} Z`,
    `M ${courtX(BASKET_X_FT - 8)} ${courtY(0)} L ${courtX(BASKET_X_FT - 8)} ${courtY(ft)} L ${courtX(BASKET_X_FT + 8)} ${courtY(ft)} L ${courtX(BASKET_X_FT + 8)} ${courtY(0)}`,
    `M ${courtX(leftCornerX)} ${courtY(0)} L ${courtX(leftCornerX)} ${courtY(yb)} ${arc(THREE_POINT_RADIUS_FT, rightCornerX, yb, 1)} L ${courtX(rightCornerX)} ${courtY(0)}`,
    `M ${courtX(BASKET_X_FT - RESTRICTED_RADIUS_FT)} ${courtY(0)} ${arc(RESTRICTED_RADIUS_FT, BASKET_X_FT + RESTRICTED_RADIUS_FT, 0, 1)}`,
    `M ${courtX(BASKET_X_FT - 3)} ${courtY(0)} L ${courtX(BASKET_X_FT + 3)} ${courtY(0)}`,
  ].join(" ");
}

export const RIM = {
  cx: courtX(BASKET_X_FT),
  cy: courtY(0.75),
  r: px(0.75),
};

export function zoneLabelPoint(zone: BasketballShotZone): { x: number; y: number } | null {
  switch (zone) {
    case "restricted_area":
      return { x: courtX(BASKET_X_FT), y: courtY(1.7) };
    case "paint":
      return { x: courtX(BASKET_X_FT), y: courtY(8.2) };
    case "mid_range":
      return { x: courtX(BASKET_X_FT), y: courtY(19) };
    case "above_the_break_3":
      return { x: courtX(BASKET_X_FT), y: courtY(33) };
    case "corner_3":
      return null;
  }
}

export const CORNER_LABEL_POINTS = [
  { x: courtX(1.5), y: courtY(4.2) },
  { x: courtX(48.5), y: courtY(4.2) },
];
