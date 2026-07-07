import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { appConfig } from "@/lib/config";
import { DashboardStatsSection } from "@/features/analytics/components/dashboard-stats-section";
import { DashboardInsightsSection } from "@/features/analytics/components/dashboard-insights-section";
import { DashboardChartsSection } from "@/features/analytics/components/dashboard-charts-section";
import { DashboardRankingsSection } from "@/features/analytics/components/dashboard-rankings-section";
import {
  DashboardStatsSkeleton,
  DashboardInsightsSkeleton,
  DashboardChartsSkeleton,
  DashboardRankingsSkeleton,
} from "@/features/analytics/components/dashboard-skeletons";

export const metadata = { title: "Overview · Football Intelligence Platform" };

export default async function DashboardPage() {
  return (
    <DashboardShell subtitle="Overview">
      <div className="space-y-6">
        <PageHeader
          title="Executive Dashboard"
          description={`Intelligence Panel · Season ${appConfig.season} · ${appConfig.name}`}
        />

        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStatsSection />
        </Suspense>

        <Suspense fallback={<DashboardInsightsSkeleton />}>
          <DashboardInsightsSection />
        </Suspense>

        <Suspense fallback={<DashboardChartsSkeleton />}>
          <DashboardChartsSection />
        </Suspense>

        <Suspense fallback={<DashboardRankingsSkeleton />}>
          <DashboardRankingsSection />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
