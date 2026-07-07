import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSession } from "@/lib/auth/session";
import { parsePlayerFilters } from "@/features/scouting/lib/parse-filters";
import { ScoutingFiltersPanelLoader } from "@/features/scouting/components/scouting-filters-panel-loader";
import { ScoutingDatabaseView } from "@/features/scouting/components/scouting-database-view";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Scouting · Football Intelligence Platform" };

function FiltersSkeleton() {
  return <Skeleton className="h-40 w-full rounded-xl" />;
}

export default async function ScoutingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const filters = parsePlayerFilters(params, "scouting");

  return (
    <DashboardShell subtitle="Scouting" userName={session?.name}>
      <div className="space-y-4">
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
