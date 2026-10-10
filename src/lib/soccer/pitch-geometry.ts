/** Attacking half, goal at the top. 10 px per meter on a 68 × 52.5 m half. */
export const PITCH_WIDTH = 680;
export const PITCH_HEIGHT = 525;

export function pitchMarker(x: number, y: number): { x: number; y: number } {
  return {
    x: (y / 100) * PITCH_WIDTH,
    y: ((100 - x) / 50) * PITCH_HEIGHT,
  };
}

export function pitchMarkerVisible(x: number): boolean {
  return x >= 50;
}
