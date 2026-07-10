import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeamsGrid } from "@/features/scouting/components/teams-grid";
import { TeamsGridSkeleton } from "@/features/scouting/components/teams-grid-skeleton";
import { TeamsLeagueFilter } from "@/features/scouting/components/teams-league-filter";
import { BrasileiraoSeasonNotice } from "@/features/scouting/components/brasileirao-season-notice";
import {
  queryCompetitionIdForLeague,
  queryTeamLeagueTabs,
  queryTeams,
} from "@/features/scouting/queries/teams";
import { getServerSport } from "@/lib/sport-server";
import { APP_NAME } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { isDbSource } from "@/lib/data-source";
import { CURRENT_SEASON } from "@/lib/seasons";

export const metadata = { title: `Clubs · ${APP_NAME}` };

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

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
  const [params, sport] = await Promise.all([searchParams, getServerSport()]);
  const isBasketball = sport === "BASKETBALL";

  const leagueParam = typeof params.league === "string" ? params.league : undefined;
  const competitionId = await queryCompetitionIdForLeague(leagueParam);

  return (
    <DashboardShell subtitle={isBasketball ? "Franquias" : "Clubs"}>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-4 shadow-panel md:p-8">
          <h1 className="mt-2 font-display text-xl font-bold text-foreground md:text-3xl">
            {isBasketball ? "Franquias & Universidades" : "Club Hub · European Leagues"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isBasketball
              ? "Explore franquias da NBA e programas da NCAA. Elencos, estatísticas e scouting em um só lugar."
              : `Filter by competition to explore clubs from the top five leagues and Brasileirão — live standings via ${
                  isDbSource() ? `Supabase + ESPN (${CURRENT_SEASON})` : "StatsBomb Open Data (demo mode)"
                }.`}
          </p>
        </div>

        <Suspense fallback={<FilterSkeleton />}>
          <TeamsToolbar leagueParam={leagueParam} />
        </Suspense>

        {!isBasketball && leagueParam === "brasileirao" ? <BrasileiraoSeasonNotice /> : null}

        <Suspense key={competitionId ?? "all"} fallback={<TeamsGridSkeleton />}>
          <TeamsGrid competitionId={competitionId} sport={sport} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
