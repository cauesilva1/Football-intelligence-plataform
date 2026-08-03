import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { parsePlayerFilters } from "@/features/scouting/lib/parse-filters";
import { getServerSport } from "@/lib/sport-server";
import { APP_NAME } from "@/lib/config";
import { ScoutingFiltersPanelLoader } from "@/features/scouting/components/scouting-filters-panel-loader";
import { ScoutingDatabaseView } from "@/features/scouting/components/scouting-database-view";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: `Scouting · ${APP_NAME}` };

export const revalidate = 300;
export const maxDuration = 60;

function FiltersSkeleton() {
  return <Skeleton className="h-40 w-full rounded-xl" />;
}

function scoutingCopy(sport: string): { title: string; description: string } {
  if (sport === "BASKETBALL") {
    return {
      title: "Basketball scouting",
      description: "Filter by metrics and archetypes, then open a profile for season evidence.",
    };
  }
  if (sport === "AMERICAN_FOOTBALL") {
    return {
      title: "American football scouting",
      description: "Filter NFL and college by position and age — production shows on the profile.",
    };
  }
  return {
    title: "Scouting",
    description: "Search or filter by role — save players, then refine on My Players.",
  };
}

export default async function ScoutingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sport = await getServerSport();
  const filters = parsePlayerFilters(params, "scouting", sport);
  const copy = scoutingCopy(sport);

  return (
    <DashboardShell
      subtitle={
        sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL"
          ? "Advanced Scouting"
          : "Scouting"
      }
    >
      <div className="space-y-5">
        {sport === "SOCCER" ? <ScoutWorkflowNav current="discover" /> : null}
        <PageHeader title={copy.title} description={copy.description} />
        <Suspense fallback={<FiltersSkeleton />}>
          <ScoutingFiltersPanelLoader
            basePath="/scouting"
            route="scouting"
            leagueId={filters.league}
          />
        </Suspense>
        <Suspense key={JSON.stringify(filters)} fallback={<ScoutingTableSkeleton rows={20} />}>
          <ScoutingDatabaseView filters={filters} basePath="/scouting" route="scouting" />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
