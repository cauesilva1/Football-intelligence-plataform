import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { parsePlayerFilters } from "@/features/scouting/lib/parse-filters";
import { ScoutingFiltersPanelLoader } from "@/features/scouting/components/scouting-filters-panel-loader";
import { ScoutingDatabaseView } from "@/features/scouting/components/scouting-database-view";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Players · Football Intelligence Platform" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

function FiltersSkeleton() {
  return <Skeleton className="h-28 w-full rounded-xl" />;
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parsePlayerFilters(params, "players");
  const suspenseKey = JSON.stringify(filters);

  return (
    <DashboardShell subtitle="Players">
      <div className="space-y-4">
        <Suspense fallback={<FiltersSkeleton />}>
          <ScoutingFiltersPanelLoader basePath="/players" route="players" />
        </Suspense>
        <Suspense key={suspenseKey} fallback={<ScoutingTableSkeleton rows={10} />}>
          <ScoutingDatabaseView filters={filters} basePath="/players" route="players" />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
