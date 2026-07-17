import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { sportTheme } from "@/lib/sport-theme";
import { APP_NAME } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: `Clubes · ${APP_NAME}` };

export const revalidate = 300;
export const maxDuration = 60;

function FilterSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
}

async function TeamsToolbar({
  leagueParam,
  competitionId,
  entityLabel,
}: {
  leagueParam: string | undefined;
  competitionId?: string;
  entityLabel: string;
}) {
  // One filtered list (+ tabs). "All" total only when a league filter is active.
  const [tabs, filteredTeams] = await Promise.all([
    queryTeamLeagueTabs(),
    queryTeams(competitionId, leagueParam, { enrich: false }),
  ]);

  const needsTotal =
    typeof leagueParam === "string" && leagueParam.length > 0 && leagueParam !== "all";
  const totalCount = needsTotal
    ? (await queryTeams(undefined, "all", { enrich: false })).length
    : filteredTeams.length;

  return (
    <TeamsLeagueFilter
      tabs={tabs}
      totalCount={totalCount}
      visibleCount={filteredTeams.length}
      entityLabel={entityLabel}
    />
  );
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, sport] = await Promise.all([searchParams, getServerSport()]);
  const theme = sportTheme(sport);
  const isBasketball = sport === "BASKETBALL";

  const leagueParam = typeof params.league === "string" ? params.league : undefined;
  const competitionId = await queryCompetitionIdForLeague(leagueParam);
  const gridKey = leagueParam ?? competitionId ?? "all";

  return (
    <DashboardShell subtitle={isBasketball ? "Franquias" : "Clubes"}>
      <div className="space-y-6">
        <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {theme.label}
          </p>
          <h1 className="mt-2 font-display text-xl font-bold text-foreground md:text-3xl">
            {isBasketball ? "Franquias & Universidades" : "Diretório de Clubes"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isBasketball
              ? "Catálogo de franquias NBA e programas NCAA para scouting: elenco, perfil e contexto. Classificação, líderes e jogos ficam em Ligas."
              : "Catálogo de clubes para scouting: elenco, perfil e contexto do time. Classificação, artilharia e jogos ficam em Torneios."}
          </p>
          {isBasketball ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/tournaments/nba"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Classificação NBA
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tournaments/ncaa"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Conferências NCAA
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tournaments"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Todas as ligas
              </Link>
            </div>
          ) : (
            <Link
              href="/tournaments"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Ver tabelas e estatísticas das ligas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <Suspense fallback={<FilterSkeleton />}>
          <TeamsToolbar
            leagueParam={leagueParam}
            competitionId={competitionId}
            entityLabel={isBasketball ? "franquias / programas" : "clubes"}
          />
        </Suspense>

        {!isBasketball && leagueParam === "brasileirao" ? <BrasileiraoSeasonNotice /> : null}

        <Suspense key={gridKey} fallback={<TeamsGridSkeleton />}>
          <TeamsGrid competitionId={competitionId} leagueKey={leagueParam} sport={sport} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
