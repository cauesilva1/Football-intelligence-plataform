"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";
import type { InsightChartPoint } from "@/lib/insights/catalog";

export function InsightBarChart({ title, points }: { title: string; points: InsightChartPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
            axisLine={{ stroke: chartTheme.axis }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
            axisLine={{ stroke: chartTheme.axis }}
          />
          <Tooltip contentStyle={chartTooltipStyle()} cursor={{ fill: chartTheme.cursor }} />
          <Bar dataKey="value" name={title} fill={chartTheme.series.primary} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
