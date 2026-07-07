import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSession } from "@/lib/auth/session";
import { TeamsGrid } from "@/features/scouting/components/teams-grid";
import { TeamsGridSkeleton } from "@/features/scouting/components/teams-grid-skeleton";
import { TeamsLeagueFilter } from "@/features/scouting/components/teams-league-filter";
import {
  queryCompetitionIdForLeague,
  queryTeamLeagueTabs,
  queryTeams,
} from "@/features/scouting/queries/teams";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Clubes · Football Intelligence Platform" };

function FilterSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
}

async function TeamsToolbar({
  leagueParam,
}: {
  leagueParam: string | undefined;
}) {
  const [tabs, competitionId] = await Promise.all([
    queryTeamLeagueTabs(),
    queryCompetitionIdForLeague(leagueParam),
  ]);

  const [allTeams, filteredTeams] = await Promise.all([
    queryTeams(),
    queryTeams(competitionId),
  ]);

  return (
    <TeamsLeagueFilter
      tabs={tabs}
      totalCount={allTeams.length}
      visibleCount={filteredTeams.length}
    />
  );
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);

  const leagueParam = typeof params.league === "string" ? params.league : undefined;
  const competitionId = await queryCompetitionIdForLeague(leagueParam);

  return (
    <DashboardShell subtitle="Clubes" userName={session?.name}>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-6 shadow-panel md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Hub de Clubes
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
            Ligas Europeias
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Filtre por competição para explorar clubes das cinco grandes ligas — estatísticas reais
            via StatsBomb Open Data.
          </p>
        </div>

        <Suspense fallback={<FilterSkeleton />}>
          <TeamsToolbar leagueParam={leagueParam} />
        </Suspense>

        <Suspense key={competitionId ?? "all"} fallback={<TeamsGridSkeleton />}>
          <TeamsGrid competitionId={competitionId} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
