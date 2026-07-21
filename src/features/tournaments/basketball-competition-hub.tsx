"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasketballStandingsTable } from "@/features/tournaments/basketball-standings-table";
import { BasketballFranchisesBoard } from "@/features/tournaments/basketball-franchises-board";
import { BasketballLeadersBoard } from "@/features/tournaments/basketball-leaders-board";
import { BasketballGamesHub } from "@/features/tournaments/components/basketball-games-hub";
import {
  HubSeasonRestore,
  HubSeasonToggle,
} from "@/features/tournaments/components/hub-season-toggle";
import type { BasketballCompetitionConfig } from "@/lib/tournaments/basketball-competitions";
import type { BasketballCompetitionHubData } from "@/lib/tournaments/basketball-hub-data";

export function BasketballCompetitionHub({
  competition,
  data,
}: {
  competition: BasketballCompetitionConfig;
  data: BasketballCompetitionHubData;
}) {
  const selectedSlice =
    data.seasonSlices.find((s) => s.seasonYear === data.selectedSeasonYear) ??
    data.seasonSlices[0];

  const standings = selectedSlice?.standings ?? data.standings;
  const leaders = selectedSlice?.leaders ?? data.leaders;

  const hasLeaders =
    leaders.points.length +
      leaders.rebounds.length +
      leaders.assists.length +
      leaders.steals.length +
      leaders.blocks.length >
    0;

  const defaultTab = competition.hasStandings
    ? "standings"
    : hasLeaders
      ? "leaders"
      : competition.hasSchedule
        ? "matches"
        : "franchises";

  const directoryLabel =
    competition.slug === "ncaa" ? "programs" : "franchises";

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
          {competition.slug === "nba" ? (
            <Link
              href="/teams?league=nba"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              All NBA franchises
            </Link>
          ) : (
            <Link
              href="/teams?league=ncaa"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Programs in scouting
            </Link>
          )}
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
            {competition.slug === "ncaa" ? "Programs" : "Franchises"}
          </TabsTrigger>
        </TabsList>

        {competition.hasStandings ? (
          <TabsContent value="standings" className="mt-0 space-y-3">
            {selectedSlice && !selectedSlice.hasStandings ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No standings for {selectedSlice.seasonLabel} yet. Select the previous season
                above — the 2026/27 structure is already available.
              </p>
            ) : (
              <BasketballStandingsTable
                groups={standings}
                enableConferenceFilter={competition.slug === "ncaa"}
              />
            )}
          </TabsContent>
        ) : null}

        {competition.hasLeaders ? (
          <TabsContent value="leaders" className="mt-0">
            {selectedSlice && !selectedSlice.hasLeaders ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No leaders for {selectedSlice.seasonLabel} yet. The previous season already has
                PPG / RPG / APG / SPG / BPG.
              </p>
            ) : (
              <BasketballLeadersBoard leaders={leaders} />
            )}
          </TabsContent>
        ) : null}

        {competition.hasSchedule ? (
          <TabsContent value="matches" className="mt-0">
            <BasketballGamesHub
              schedule={data.schedule}
              compact
              title={competition.slug === "ncaa" ? "Agenda NCAA" : "Agenda NBA"}
              subtitle={
                competition.slug === "ncaa"
                  ? "College games — select one to open the box score."
                  : "Live, recent results, and upcoming games — select one to open the box score."
              }
            />
          </TabsContent>
        ) : null}

        <TabsContent value="franchises" className="mt-0">
          <BasketballFranchisesBoard
            franchises={data.franchises}
            emptyLabel={
              competition.slug === "ncaa"
                ? "No NCAA programs in the database yet. Run the NCAA sync or open the directory."
                : "No NBA franchises in the database yet."
            }
            directoryHref={`/teams?league=${competition.teamsLeagueParam}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
