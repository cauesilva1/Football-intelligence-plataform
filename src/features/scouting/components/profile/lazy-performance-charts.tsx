"use client";

import dynamic from "next/dynamic";
import type { SeasonTimelinePoint } from "@/features/scouting/lib/season-history";
import type { Sport } from "@/lib/sport";
import type { RadarSeries } from "@/components/charts/stat-radar-chart";

const chartSkeleton = (
  <div className="h-[260px] animate-pulse rounded-lg bg-surface-muted/40" aria-hidden />
);

const LazySeasonChart = dynamic(
  () =>
    import("@/components/charts/player-season-chart").then((mod) => mod.PlayerSeasonChart),
  { ssr: false, loading: () => chartSkeleton }
);

const LazyRadarChart = dynamic(
  () => import("@/components/charts/stat-radar-chart").then((mod) => mod.StatRadarChart),
  { ssr: false, loading: () => chartSkeleton }
);

export function LazyPlayerSeasonChart({
  data,
  sport,
}: {
  data: SeasonTimelinePoint[];
  sport?: Sport;
}) {
  return <LazySeasonChart data={data} sport={sport} />;
}

export function LazyStatRadarChart({
  metrics,
  series,
}: {
  metrics: string[];
  series: RadarSeries[];
}) {
  return <LazyRadarChart metrics={metrics} series={series} />;
}
