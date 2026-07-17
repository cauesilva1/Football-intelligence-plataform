"use client";

import dynamic from "next/dynamic";
import type { RadarSeries } from "@/components/charts/stat-radar-chart";
import type { ComparisonCategory } from "@/features/comparison/lib/categories";

const chartSkeleton = (
  <div className="h-[260px] animate-pulse rounded-lg bg-surface-muted/40" aria-hidden />
);

const LazyComparisonBar = dynamic(
  () =>
    import("@/components/charts/comparison-bar-chart").then((mod) => mod.ComparisonBarChart),
  { ssr: false, loading: () => chartSkeleton }
);

const LazyRadar = dynamic(
  () => import("@/components/charts/stat-radar-chart").then((mod) => mod.StatRadarChart),
  { ssr: false, loading: () => chartSkeleton }
);

export function LazyComparisonBarChart({
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
  return (
    <LazyComparisonBar
      categories={categories}
      playerAName={playerAName}
      playerBName={playerBName}
      valuesA={valuesA}
      valuesB={valuesB}
    />
  );
}

export function LazyComparisonRadarChart({
  metrics,
  series,
}: {
  metrics: string[];
  series: RadarSeries[];
}) {
  return <LazyRadar metrics={metrics} series={series} />;
}
