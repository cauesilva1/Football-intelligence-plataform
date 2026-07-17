import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { parsePlayerFilters } from "@/features/scouting/lib/parse-filters";
import { getServerSport } from "@/lib/sport-server";
import { APP_NAME } from "@/lib/config";
import { ScoutingFiltersPanelLoader } from "@/features/scouting/components/scouting-filters-panel-loader";
import { ScoutingDatabaseView } from "@/features/scouting/components/scouting-database-view";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: `Players · ${APP_NAME}` };

export const revalidate = 300;
export const maxDuration = 60;

function FiltersSkeleton() {
  return <Skeleton className="h-28 w-full rounded-xl" />;
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sport = await getServerSport();
  const filters = parsePlayerFilters(params, "players", sport);
  const suspenseKey = JSON.stringify(filters);

  return (
    <DashboardShell
      subtitle={
        sport === "BASKETBALL"
          ? "Roster & Prospects"
          : sport === "AMERICAN_FOOTBALL"
            ? "Roster & Prospects"
            : "Players"
      }
    >
      <div className="space-y-4">
        {sport === "BASKETBALL" ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-4 shadow-panel md:p-6">
            <h1 className="font-display text-lg font-bold text-foreground md:text-xl">Basketball Roster</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Search NBA and NCAA players. Filter by franchise, position, and season.
            </p>
          </div>
        ) : null}
        {sport === "AMERICAN_FOOTBALL" ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-4 shadow-panel md:p-6">
            <h1 className="font-display text-lg font-bold text-foreground md:text-xl">
              American Football Roster
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Players load on demand when opening an NFL franchise or elite CFB program.
            </p>
          </div>
        ) : null}
        <Suspense fallback={<FiltersSkeleton />}>
          <ScoutingFiltersPanelLoader
            basePath="/players"
            route="players"
            leagueId={filters.league}
          />
        </Suspense>
        <Suspense key={suspenseKey} fallback={<ScoutingTableSkeleton rows={10} />}>
          <ScoutingDatabaseView filters={filters} basePath="/players" route="players" />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
