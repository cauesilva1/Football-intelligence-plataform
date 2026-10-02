"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";
import { formatChartNumber } from "@/lib/format/display-number";

export function GoalsBarChart({
  data,
  valueLabel = "goals",
}: {
  data: { position: string; goals: number }[];
  /** Tooltip / series label — avoid soccer "goals" on other sports. */
  valueLabel?: string;
}) {
  const chartData = data.map((row) => ({
    position: row.position,
    [valueLabel]: row.goals,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="position"
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          tickFormatter={(value) => formatChartNumber(value)}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <Tooltip
          contentStyle={chartTooltipStyle()}
          cursor={{ fill: chartTheme.cursor }}
          formatter={(value) => formatChartNumber(value)}
        />
        <Bar dataKey={valueLabel} fill={chartTheme.series.primary} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
