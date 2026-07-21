import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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

export default async function ScoutingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sport = await getServerSport();
  const filters = parsePlayerFilters(params, "scouting", sport);

  return (
    <DashboardShell
      subtitle={
        sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL"
          ? "Advanced Scouting"
          : "Scouting"
      }
    >
      <div className="space-y-4">
        {sport === "BASKETBALL" ? (
          <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-6">
            <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">Basketball Scouting</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Refine your search with advanced metrics, archetypes, and performance sliders.
            </p>
          </div>
        ) : null}
        {sport === "AMERICAN_FOOTBALL" ? (
          <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-6">
            <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">
              American Football Scouting
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Filter NFL and College Football by position, age, and rating — season production is shown on the profile.
            </p>
          </div>
        ) : null}
        {sport === "SOCCER" ? (
          <div className="space-y-3">
            <ScoutWorkflowNav current="discover" />
            <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-6">
              <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">Scouting</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Search by name or filter by role — save players from the list, then refine on My Players.
              </p>
            </div>
          </div>
        ) : null}
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
