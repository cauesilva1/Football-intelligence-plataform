"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";

export interface RadarSeries {
  name: string;
  color: string;
  values: Record<string, number>;
}

export function StatRadarChart({ metrics, series }: { metrics: string[]; series: RadarSeries[] }) {
  const data = metrics.map((metric) => {
    const point: Record<string, string | number> = { metric };
    series.forEach((s) => {
      point[s.name] = s.values[metric] ?? 0;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={chartTheme.grid} />
        <PolarAngleAxis dataKey="metric" tick={{ fill: chartTheme.label, fontSize: chartTheme.axisTick.fontSize }} />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.radiusTick.fontSize }}
        />
        {series.map((s) => (
          <Radar
            key={s.name}
            name={s.name}
            dataKey={s.name}
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.25}
          />
        ))}
        <Legend wrapperStyle={chartTheme.legend} />
        <Tooltip contentStyle={chartTooltipStyle()} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
