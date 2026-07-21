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
import { SCORE_DEFINITIONS } from "@/lib/score-definitions";

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
            <span className="rounded-md border border-border bg-surface-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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

        <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Score definitions
          </p>
          <dl className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <dt className="font-medium text-foreground">Top Prospects</dt>
              <dd className="mt-0.5 leading-relaxed">{SCORE_DEFINITIONS.topProspects}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Best Performers</dt>
              <dd className="mt-0.5 leading-relaxed">{SCORE_DEFINITIONS.bestPerformers}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Market Opportunities</dt>
              <dd className="mt-0.5 leading-relaxed">{SCORE_DEFINITIONS.marketOpportunities}</dd>
            </div>
          </dl>
        </div>

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
