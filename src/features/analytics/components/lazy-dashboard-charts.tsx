"use client";

import dynamic from "next/dynamic";

const chartSkeleton = (
  <div className="h-[260px] animate-pulse rounded-lg bg-surface-muted/40" aria-hidden />
);

const LazyGoalsBar = dynamic(
  () => import("@/components/charts/goals-bar-chart").then((mod) => mod.GoalsBarChart),
  { ssr: false, loading: () => chartSkeleton }
);

const LazyRatingTrend = dynamic(
  () => import("@/components/charts/rating-trend-chart").then((mod) => mod.RatingTrendChart),
  { ssr: false, loading: () => chartSkeleton }
);

export function LazyGoalsBarChart({
  data,
  valueLabel,
}: {
  data: { position: string; goals: number }[];
  valueLabel?: string;
}) {
  return <LazyGoalsBar data={data} valueLabel={valueLabel} />;
}

export function LazyRatingTrendChart({
  data,
}: {
  data: { season: string; avgRating: number }[];
}) {
  return <LazyRatingTrend data={data} />;
}
