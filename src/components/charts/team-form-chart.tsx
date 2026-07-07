"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";

export function TeamFormChart({
  data,
}: {
  data: { label: string; xG: number; xGA: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <Tooltip contentStyle={chartTooltipStyle()} cursor={{ fill: chartTheme.cursor }} />
        <Legend wrapperStyle={chartTheme.legend} />
        <Bar dataKey="xG" name="xG" fill={chartTheme.series.primary} radius={[6, 6, 0, 0]} />
        <Bar dataKey="xGA" name="xGA" fill={chartTheme.series.negative} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
