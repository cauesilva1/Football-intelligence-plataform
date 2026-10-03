"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";
import { formatChartNumber } from "@/lib/format/display-number";

function onIndexScale(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export interface RadarSeries {
  name: string;
  color: string;
  values: Record<string, number>;
}

function isTooLightForPaper(color: string): boolean {
  const raw = color.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/i.test(raw)) return false;
  const channel = (i: number) => Number.parseInt(raw.slice(i, i + 2), 16) / 255;
  const [r, g, b] = [channel(0), channel(2), channel(4)];
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.62;
}

export function StatRadarChart({ metrics, series }: { metrics: string[]; series: RadarSeries[] }) {
  const data = metrics.map((metric) => {
    const point: Record<string, string | number> = { metric };
    series.forEach((s) => {
      point[s.name] = onIndexScale(s.values[metric]);
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={chartTheme.grid} />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: chartTheme.label, fontSize: chartTheme.axisTick.fontSize }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          allowDataOverflow
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.radiusTick.fontSize }}
          tickFormatter={(value) => formatChartNumber(value)}
        />
        {series.map((s) => {
          const color = isTooLightForPaper(s.color) ? chartTheme.series.primary : s.color;
          return (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={s.name}
              stroke={color}
              fill={color}
              fillOpacity={0.32}
              strokeWidth={2.5}
            />
          );
        })}
        <Legend wrapperStyle={chartTheme.legend} />
        <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => formatChartNumber(value)} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
