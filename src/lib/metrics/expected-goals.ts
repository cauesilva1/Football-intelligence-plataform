/**
 * The FBref light CSV has no xG/xA columns. The loader used to store 0, which
 * renders like a measured zero. Joint zeros are "not measured". A measured zero
 * on one side is kept when the other side is a positive measured value.
 * Storing a true 0/0 measurement would need a nullable column (schema unchanged).
 */
export function expectedGoalsAreMeasured(xG: number, xA: number): boolean {
  return xG > 0 || xA > 0;
}

export function formatExpectedGoalsRate(
  minutesPlayed: number,
  xG: number,
  xA: number
): string | null {
  if (!expectedGoalsAreMeasured(xG, xA)) return null;
  if (minutesPlayed <= 0) return null;
  return ((xG / minutesPlayed) * 90).toFixed(2);
}

export function formatMeasuredExpectedGoal(value: number, xG: number, xA: number): string | null {
  if (!expectedGoalsAreMeasured(xG, xA)) return null;
  return value.toFixed(2);
}

export function formatExpectedGoalsTotal(xG: number, xA: number): string | null {
  return formatMeasuredExpectedGoal(xG, xG, xA);
}
