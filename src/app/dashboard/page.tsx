import { Suspense } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { appConfig, APP_NAME } from "@/lib/config";
import { getServerSport } from "@/lib/sport-server";
import { sportLabel } from "@/lib/sport";
import { DashboardStatsSection } from "@/features/analytics/components/dashboard-stats-section";
import { DashboardInsightsSection } from "@/features/analytics/components/dashboard-insights-section";
import { DashboardChartsSection } from "@/features/analytics/components/dashboard-charts-section";
import { DashboardRankingsSection } from "@/features/analytics/components/dashboard-rankings-section";
import { DashboardClubsSection } from "@/features/analytics/components/dashboard-clubs-section";
import {
  DashboardStatsSkeleton,
  DashboardInsightsSkeleton,
  DashboardChartsSkeleton,
  DashboardRankingsSkeleton,
} from "@/features/analytics/components/dashboard-skeletons";

export const metadata = { title: `Overview · ${APP_NAME}` };

/** Sport still comes from cookie — HTML stays dynamic; data layer uses unstable_cache (180s). */
export const revalidate = 180;
export const maxDuration = 60;

export default async function DashboardPage() {
  const sport = await getServerSport();
  const viewing = sportLabel(sport);

  return (
    <DashboardShell subtitle="Overview">
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description={
            sport === "SOCCER"
              ? "Soccer is the reference sport for the full scout workflow — use the sport switcher above for basketball or American football."
              : sport === "BASKETBALL"
                ? "Basketball overview. Soccer remains the reference sport for the full scout workflow."
                : "American football overview. Soccer remains the reference sport for the full scout workflow."
          }
          badge={
            <span className="rounded-md border border-border bg-surface-muted/50 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {viewing} · {appConfig.season}
            </span>
          }
          actions={
            <Link
              href="/methodology"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              How scores work
            </Link>
          }
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
