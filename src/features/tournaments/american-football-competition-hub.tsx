"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasketballStandingsTable } from "@/features/tournaments/basketball-standings-table";
import { BasketballFranchisesBoard } from "@/features/tournaments/basketball-franchises-board";
import { AmericanFootballLeadersBoard } from "@/features/tournaments/american-football-leaders-board";
import { AmericanFootballGamesHub } from "@/features/tournaments/components/american-football-games-hub";
import {
  HubSeasonRestore,
  HubSeasonToggle,
} from "@/features/tournaments/components/hub-season-toggle";
import type { AmericanFootballCompetitionConfig } from "@/lib/tournaments/american-football-competitions";
import type { FootballCompetitionHubData } from "@/lib/tournaments/american-football-hub-data";

export function AmericanFootballCompetitionHub({
  competition,
  data,
}: {
  competition: AmericanFootballCompetitionConfig;
  data: FootballCompetitionHubData;
}) {
  const selectedSlice =
    data.seasonSlices.find((s) => s.seasonYear === data.selectedSeasonYear) ??
    data.seasonSlices[0];

  const standings = selectedSlice?.standings ?? data.standings;
  const leaders = selectedSlice?.leaders ?? data.leaders;

  const hasLeaders =
    leaders.passingYards.length +
      leaders.rushingYards.length +
      leaders.receivingYards.length +
      leaders.sacks.length +
      leaders.tackles.length >
    0;

  const defaultTab = competition.hasStandings
    ? "standings"
    : hasLeaders
      ? "leaders"
      : competition.hasSchedule
        ? "matches"
        : "franchises";

  const directoryLabel =
    competition.slug === "college-football" ? "programs" : "franchises";

  return (
    <div className="space-y-6">
      <HubSeasonRestore slug={competition.slug} />
      <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-panel md:p-8">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leagues
        </Link>
        <p className="mt-3 text-2xs font-semibold uppercase tracking-[0.2em] text-primary">
          {competition.badge}
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-foreground md:text-3xl">
          {competition.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{competition.description}</p>
        {data.notice ? (
          <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-2xs font-semibold text-primary">
            {data.notice}
          </p>
        ) : null}

        {data.seasonSlices.length > 0 ? (
          <div className="mt-4">
            <HubSeasonToggle
              slug={competition.slug}
              slices={data.seasonSlices}
              selectedSeasonYear={data.selectedSeasonYear}
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={`/teams?league=${competition.teamsLeagueParam}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open {directoryLabel} directory
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} key={data.selectedSeasonYear}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          {competition.hasStandings ? (
            <TabsTrigger value="standings">Standings</TabsTrigger>
          ) : null}
          {competition.hasLeaders ? (
            <TabsTrigger value="leaders">Statistics</TabsTrigger>
          ) : null}
          {competition.hasSchedule ? <TabsTrigger value="matches">Games</TabsTrigger> : null}
          <TabsTrigger value="franchises">
            {competition.slug === "college-football" ? "Programs" : "Franchises"}
          </TabsTrigger>
        </TabsList>

        {competition.hasStandings ? (
          <TabsContent value="standings" className="mt-0 space-y-3">
            {selectedSlice && !selectedSlice.hasStandings ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No standings for {selectedSlice.seasonLabel} yet. Select the previous season
                above.
              </p>
            ) : (
              <BasketballStandingsTable
                groups={standings}
                enableConferenceFilter={competition.slug === "college-football"}
              />
            )}
          </TabsContent>
        ) : null}

        {competition.hasLeaders ? (
          <TabsContent value="leaders" className="mt-0">
            {selectedSlice && !selectedSlice.hasLeaders ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No leaders for {selectedSlice.seasonLabel} yet. The previous season typically has
                passing, rushing, and receiving data.
              </p>
            ) : (
              <AmericanFootballLeadersBoard leaders={leaders} />
            )}
          </TabsContent>
        ) : null}

        {competition.hasSchedule ? (
          <TabsContent value="matches" className="mt-0">
            <AmericanFootballGamesHub
              schedule={data.schedule}
              compact
              title={
                competition.slug === "college-football" ? "Agenda CFB" : "Agenda NFL"
              }
              subtitle="Live, recent results, and upcoming games."
            />
          </TabsContent>
        ) : null}

        <TabsContent value="franchises" className="mt-0">
          <BasketballFranchisesBoard
            franchises={data.franchises}
            emptyLabel={
              competition.slug === "college-football"
                ? "No elite CFB programs in the database yet. Open the directory to start the bootstrap."
                : "No NFL franchises in the database yet."
            }
            directoryHref={`/teams?league=${competition.teamsLeagueParam}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
