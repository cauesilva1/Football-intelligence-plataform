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
  queryTeamsDirectory,
} from "@/features/scouting/queries/teams";
import { getServerSport } from "@/lib/sport-server";
import { sportTheme } from "@/lib/sport-theme";
import { APP_NAME } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: `Teams · ${APP_NAME}` };

export const revalidate = 180;
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
  const [tabs, directory] = await Promise.all([
    queryTeamLeagueTabs(),
    queryTeamsDirectory(competitionId, leagueParam, {
      enrich: false,
      page: 1,
      pageSize: 1,
    }),
  ]);

  const count = directory.total;

  return (
    <TeamsLeagueFilter
      tabs={tabs}
      totalCount={count}
      visibleCount={count}
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
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";
  const isFranchiseSport = isBasketball || isAmericanFootball;

  const leagueParam = typeof params.league === "string" ? params.league : undefined;
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const competitionId = await queryCompetitionIdForLeague(leagueParam);
  const gridKey = `${leagueParam ?? competitionId ?? "all"}-p${page}`;

  const subtitle = isBasketball
    ? "Franchises"
    : isAmericanFootball
      ? "Franchises & Programs"
      : "Clubs";

  const entityLabel = isBasketball
    ? "franchises / programs"
    : isAmericanFootball
      ? "franchises / programs"
      : "clubs";

  return (
    <DashboardShell subtitle={subtitle}>
      <div className="space-y-6">
        <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-8">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary">
            {theme.label}
          </p>
          <h1 className="mt-2 font-display text-xl font-bold text-foreground md:text-3xl">
            {isBasketball
              ? "Franchises & Colleges"
              : isAmericanFootball
                ? "NFL Franchises & CFB Programs"
                : "Club Directory"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isBasketball
              ? "NBA franchises and NCAA programs for scouting: roster, profile, and context. Standings, leaders, and games are available in Leagues."
              : isAmericanFootball
                ? "NFL franchises and College Football programs: roster, profile, and context. Standings, leaders, and games are available in Leagues."
                : "Club directory for scouting: roster, profile, and team context. Standings, scoring leaders, and games are available in Tournaments."}
          </p>
          {isBasketball ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/tournaments/nba"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                NBA Standings
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tournaments/ncaa"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                NCAA Conferences
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tournaments"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                All leagues
              </Link>
            </div>
          ) : isAmericanFootball ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/tournaments/nfl"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Hub NFL
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tournaments/college-football"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Hub College Football
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tournaments"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                All leagues
              </Link>
            </div>
          ) : (
            <Link
              href="/tournaments"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View league standings and statistics
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <Suspense fallback={<FilterSkeleton />}>
          <TeamsToolbar
            leagueParam={leagueParam}
            competitionId={competitionId}
            entityLabel={entityLabel}
          />
        </Suspense>

        {!isFranchiseSport && leagueParam === "brasileirao" ? <BrasileiraoSeasonNotice /> : null}

        <Suspense key={gridKey} fallback={<TeamsGridSkeleton />}>
          <TeamsGrid
            competitionId={competitionId}
            leagueKey={leagueParam}
            sport={sport}
            page={page}
          />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
