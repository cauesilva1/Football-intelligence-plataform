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
import type { Sport } from "@/lib/sport";

export function PlayerSeasonChart({
  data,
  sport = "SOCCER",
}: {
  data: SeasonTimelinePoint[];
  sport?: Sport;
}) {
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";
  const productionLabel = isBasketball
    ? "Pts/Game"
    : isAmericanFootball
      ? "Yards"
      : "Goals/90";

  if (data.length === 0) {
    return (
      <p className="flex h-[260px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
        No season history on file yet for this player.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.length < 2 ? (
        <p className="rounded-sm border border-border bg-surface-muted/60 px-2.5 py-1.5 text-2xs text-muted-foreground">
          Only one productive season on file — evolution appears once prior seasons are backfilled.
        </p>
      ) : null}
      <ResponsiveContainer width="100%" height={data.length < 2 ? 220 : 260}>
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
            name={productionLabel}
            stroke={chartTheme.series.primary}
            strokeWidth={2}
            dot={{ r: 3, fill: chartTheme.series.primary }}
          />
          {!isBasketball && !isAmericanFootball ? (
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
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
