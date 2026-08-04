/**
 * Centralized Recharts theme — mirrors CSS variables in globals.css (editorial light).
 * Recharts needs resolved color strings; keep in sync with :root --chart-* tokens.
 */

const hsl = (channel: string, alpha?: number) =>
  alpha ? `hsl(${channel} / ${alpha})` : `hsl(${channel})`;

/** Static theme (SSR-safe). Matches --chart-* variables in globals.css. */
export const chartTheme = {
  grid: hsl("210 10% 92%"),
  axis: hsl("210 10% 84%"),
  tick: hsl("200 7% 42%"),
  label: hsl("0 0% 18%"),
  tooltip: {
    background: hsl("0 0% 100%"),
    border: hsl("210 10% 90%"),
    borderRadius: 2,
    fontSize: 12,
    color: hsl("0 0% 7%"),
  },
  cursor: hsl("210 10% 96%", 0.85),
  series: {
    primary: hsl("353 100% 42%"),
    secondary: hsl("210 70% 40%"),
    negative: hsl("148 55% 32%"),
  },
  legend: {
    fontSize: 12,
    color: hsl("200 7% 40%"),
  },
  axisTick: { fontSize: 11 },
  radiusTick: { fontSize: 9 },
} as const;

/** Resolved tooltip contentStyle for Recharts Tooltip. */
export function chartTooltipStyle() {
  return {
    background: chartTheme.tooltip.background,
    border: `1px solid ${chartTheme.tooltip.border}`,
    borderRadius: chartTheme.tooltip.borderRadius,
    fontSize: chartTheme.tooltip.fontSize,
    color: chartTheme.tooltip.color,
  };
}

/** Reads live CSS variables on the client; falls back to static theme. */
export function resolveChartColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw ? `hsl(${raw})` : fallback;
}
