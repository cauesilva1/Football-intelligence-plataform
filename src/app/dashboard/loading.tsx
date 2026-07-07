import {
  DashboardStatsSkeleton,
  DashboardInsightsSkeleton,
  DashboardChartsSkeleton,
  DashboardRankingsSkeleton,
} from "@/features/analytics/components/dashboard-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <DashboardStatsSkeleton />
      <DashboardInsightsSkeleton />
      <DashboardChartsSkeleton />
      <DashboardRankingsSkeleton />
    </div>
  );
}
