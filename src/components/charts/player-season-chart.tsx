"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartTheme, chartTooltipStyle } from "@/lib/chart-theme";
import type { SeasonTimelinePoint } from "@/features/scouting/lib/season-history";

export function PlayerSeasonChart({ data }: { data: SeasonTimelinePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="season"
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          yAxisId="rating"
          domain={[5, 9]}
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <YAxis
          yAxisId="per90"
          orientation="right"
          domain={[0, "auto"]}
          tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisTick.fontSize }}
          axisLine={{ stroke: chartTheme.axis }}
        />
        <Tooltip contentStyle={chartTooltipStyle()} />
        <Legend wrapperStyle={chartTheme.legend} />
        <Line
          yAxisId="rating"
          type="monotone"
          dataKey="rating"
          name="Rating"
          stroke={chartTheme.series.secondary}
          strokeWidth={2.5}
          dot={{ r: 4, fill: chartTheme.series.secondary }}
        />
        <Line
          yAxisId="per90"
          type="monotone"
          dataKey="goalsPer90"
          name="Gols/90"
          stroke={chartTheme.series.primary}
          strokeWidth={2}
          dot={{ r: 3, fill: chartTheme.series.primary }}
        />
        <Line
          yAxisId="per90"
          type="monotone"
          dataKey="xGPer90"
          name="xG/90"
          stroke={chartTheme.series.negative}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ r: 3, fill: chartTheme.series.negative }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
