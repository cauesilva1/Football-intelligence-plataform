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
import { formatChartNumber } from "@/lib/format/display-number";
import type { ComparisonCategory } from "@/features/comparison/lib/categories";

function onIndexScale(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

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
    [playerAName]: onIndexScale(valuesA[category]),
    [playerBName]: onIndexScale(valuesB[category]),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          allowDataOverflow
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          tickFormatter={(value) => formatChartNumber(value)}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={88}
          tick={{ fill: chartTheme.label, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => formatChartNumber(value)} />
        <Legend wrapperStyle={chartTheme.legend} />
        <Bar dataKey={playerAName} fill={chartTheme.series.primary} radius={[0, 4, 4, 0]} barSize={14} />
        <Bar dataKey={playerBName} fill={chartTheme.series.secondary} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
