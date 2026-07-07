"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";

export function GoalsBarChart({ data }: { data: { position: string; goals: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="position"
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <Tooltip contentStyle={chartTooltipStyle()} cursor={{ fill: chartTheme.cursor }} />
        <Bar dataKey="goals" fill={chartTheme.series.primary} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
