import { Suspense } from "react";
import { EditorialShell } from "@/components/layout/editorial-shell";
import { parsePlayerFilters } from "@/features/scouting/lib/parse-filters";
import { getServerSport } from "@/lib/sport-server";
import { APP_NAME } from "@/lib/config";
import { ScoutingFiltersPanelLoader } from "@/features/scouting/components/scouting-filters-panel-loader";
import { ScoutingDatabaseView } from "@/features/scouting/components/scouting-database-view";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { ScoutingDeskMasthead } from "@/features/scouting/components/scouting-desk-masthead";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: `Scouting · ${APP_NAME}` };

export const revalidate = 300;
export const maxDuration = 60;

function FiltersSkeleton() {
  return <Skeleton className="h-28 w-full rounded-sm" />;
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
    <EditorialShell>
      <div className="desk-page">
        <ScoutingDeskMasthead sport={sport} />

        <section className="desk-section" aria-label="Filters">
          <Suspense fallback={<FiltersSkeleton />}>
            <ScoutingFiltersPanelLoader
              basePath="/scouting"
              route="scouting"
              leagueId={filters.league}
            />
          </Suspense>
        </section>

        <section className="desk-section" aria-label="Results">
          <Suspense key={JSON.stringify(filters)} fallback={<ScoutingTableSkeleton rows={20} />}>
            <ScoutingDatabaseView filters={filters} basePath="/scouting" route="scouting" />
          </Suspense>
        </section>
      </div>
    </EditorialShell>
  );
}
