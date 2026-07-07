"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";

export function RatingTrendChart({ data }: { data: { season: string; avgRating: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="season"
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          domain={[5, 9]}
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <Tooltip contentStyle={chartTooltipStyle()} />
        <Line
          type="monotone"
          dataKey="avgRating"
          stroke={chartTheme.series.secondary}
          strokeWidth={2.5}
          dot={{ r: 4, fill: chartTheme.series.secondary }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
