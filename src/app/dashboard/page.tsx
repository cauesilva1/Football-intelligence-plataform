import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { appConfig } from "@/lib/config";
import { getServerSport } from "@/lib/sport-server";
import { sportLabel } from "@/lib/sport";
import { DashboardStatsSection } from "@/features/analytics/components/dashboard-stats-section";
import { DashboardInsightsSection } from "@/features/analytics/components/dashboard-insights-section";
import { DashboardChartsSection } from "@/features/analytics/components/dashboard-charts-section";
import { DashboardRankingsSection } from "@/features/analytics/components/dashboard-rankings-section";
import { HOT_PATH_REVALIDATE_SECONDS } from "@/lib/http-cache";
import { APP_NAME } from "@/lib/config";
import { DashboardClubsSection } from "@/features/analytics/components/dashboard-clubs-section";
import {
  DashboardStatsSkeleton,
  DashboardInsightsSkeleton,
  DashboardChartsSkeleton,
  DashboardRankingsSkeleton,
} from "@/features/analytics/components/dashboard-skeletons";

export const metadata = { title: `Overview · ${APP_NAME}` };

/** Sport still comes from cookie — HTML stays dynamic; data layer uses unstable_cache (180s). */
export const revalidate = HOT_PATH_REVALIDATE_SECONDS;
export const maxDuration = 60;

export default async function DashboardPage() {
  const sport = await getServerSport();

  return (
    <DashboardShell subtitle="Overview">
      <div className="space-y-6">
        <PageHeader
          title={`Executive Dashboard · ${sportLabel(sport)}`}
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

        <Suspense fallback={<DashboardRankingsSkeleton />}>
          <DashboardClubsSection />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
