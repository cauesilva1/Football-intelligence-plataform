import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { parsePlayerFilters } from "@/features/scouting/lib/parse-filters";
import { getServerSport } from "@/lib/sport-server";
import { APP_NAME } from "@/lib/config";
import { ScoutingFiltersPanelLoader } from "@/features/scouting/components/scouting-filters-panel-loader";
import { ScoutingDatabaseView } from "@/features/scouting/components/scouting-database-view";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
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
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-4 shadow-panel md:p-6">
            <h1 className="font-display text-lg font-bold text-foreground md:text-xl">Basketball Scouting</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Refine your search with advanced metrics, archetypes, and performance sliders.
            </p>
          </div>
        ) : null}
        {sport === "AMERICAN_FOOTBALL" ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-4 shadow-panel md:p-6">
            <h1 className="font-display text-lg font-bold text-foreground md:text-xl">
              American Football Scouting
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Filter NFL and College Football by position, age, and rating — season production is shown on the profile.
            </p>
          </div>
        ) : null}
        <Suspense fallback={<FiltersSkeleton />}>
          <ScoutingFiltersPanelLoader basePath="/scouting" route="scouting" />
        </Suspense>
        <Suspense key={JSON.stringify(filters)} fallback={<ScoutingTableSkeleton rows={20} />}>
          <ScoutingDatabaseView filters={filters} basePath="/scouting" route="scouting" />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
