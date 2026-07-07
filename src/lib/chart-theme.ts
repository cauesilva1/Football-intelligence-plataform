/**
 * Centralized Recharts theme — values mirror CSS variables in globals.css.
 * Recharts requires resolved color strings; keep in sync with :root tokens.
 */

const hsl = (channel: string, alpha?: number) =>
  alpha ? `hsl(${channel} / ${alpha})` : `hsl(${channel})`;

/** Static theme (SSR-safe). Matches --chart-* variables in globals.css. */
export const chartTheme = {
  grid: hsl("215 18% 14%"),
  axis: hsl("215 18% 18%"),
  tick: hsl("215 10% 55%"),
  label: hsl("214 20% 80%"),
  tooltip: {
    background: hsl("220 20% 8%"),
    border: hsl("215 18% 18%"),
    borderRadius: 8,
    fontSize: 12,
    color: hsl("214 32% 91%"),
  },
  cursor: hsl("215 18% 14%", 0.35),
  series: {
    primary: hsl("142 71% 45%"),
    secondary: hsl("217 91% 65%"),
    negative: hsl("350 72% 58%"),
  },
  legend: {
    fontSize: 12,
    color: hsl("214 20% 80%"),
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
