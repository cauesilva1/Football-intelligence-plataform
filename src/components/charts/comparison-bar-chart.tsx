"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";
import type { ComparisonCategory } from "@/features/comparison/lib/categories";

export function ComparisonBarChart({
  categories,
  playerAName,
  playerBName,
  valuesA,
  valuesB,
}: {
  categories: ComparisonCategory[];
  playerAName: string;
  playerBName: string;
  valuesA: Record<ComparisonCategory, number>;
  valuesB: Record<ComparisonCategory, number>;
}) {
  const data = categories.map((category) => ({
    category,
    [playerAName]: valuesA[category],
    [playerBName]: valuesB[category],
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={88}
          tick={{ fill: chartTheme.label, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <Tooltip contentStyle={chartTooltipStyle()} />
        <Legend wrapperStyle={chartTheme.legend} />
        <Bar dataKey={playerAName} fill={chartTheme.series.primary} radius={[0, 4, 4, 0]} barSize={14} />
        <Bar dataKey={playerBName} fill={chartTheme.series.secondary} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
