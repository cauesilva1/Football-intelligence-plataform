"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { BasketballStandingsTable } from "@/features/tournaments/basketball-standings-table";
import { BasketballFranchisesBoard } from "@/features/tournaments/basketball-franchises-board";
import { BasketballLeadersBoard } from "@/features/tournaments/basketball-leaders-board";
import { BasketballGamesHub } from "@/features/tournaments/components/basketball-games-hub";
import type { BasketballCompetitionConfig } from "@/lib/tournaments/basketball-competitions";
import type { BasketballCompetitionHubData } from "@/lib/tournaments/basketball-hub-data";
import { cn } from "@/lib/utils";

function SeasonToggle({
  slug,
  slices,
  selectedSeasonYear,
}: {
  slug: string;
  slices: BasketballCompetitionHubData["seasonSlices"];
  selectedSeasonYear: number;
}) {
  if (slices.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Temporada
      </span>
      {slices.map((slice) => {
        const active = slice.seasonYear === selectedSeasonYear;
        const suffix =
          slice.kind === "current"
            ? slice.hasStandings || slice.hasLeaders
              ? "atual"
              : "atual · sem dados"
            : "passada";
        return (
          <Link
            key={slice.seasonYear}
            href={`/tournaments/${slug}?season=${slice.seasonYear}`}
            className={cn(
              buttonVariants({
                variant: active ? "default" : "outline",
                size: "sm",
              }),
              "h-8 px-3 text-xs"
            )}
            scroll={false}
          >
            {slice.seasonLabel}
            <span
              className={cn(
                "ml-1.5 font-normal",
                active ? "opacity-80" : "text-muted-foreground"
              )}
            >
              · {suffix}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

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
    competition.slug === "ncaa" ? "programas" : "franquias";

  return (
    <div className="space-y-6">
      <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-panel md:p-8">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ligas
        </Link>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {competition.badge}
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-foreground md:text-3xl">
          {competition.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{competition.description}</p>
        {data.notice ? (
          <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            {data.notice}
          </p>
        ) : null}

        {data.seasonSlices.length > 0 ? (
          <div className="mt-4">
            <SeasonToggle
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
            Abrir diretório de {directoryLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {competition.slug === "nba" ? (
            <Link
              href="/teams?league=nba"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Todas as franquias NBA
            </Link>
          ) : (
            <Link
              href="/teams?league=ncaa"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Programas no scouting
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab} key={data.selectedSeasonYear}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          {competition.hasStandings ? (
            <TabsTrigger value="standings">Classificação</TabsTrigger>
          ) : null}
          {competition.hasLeaders ? (
            <TabsTrigger value="leaders">Estatísticas</TabsTrigger>
          ) : null}
          {competition.hasSchedule ? <TabsTrigger value="matches">Jogos</TabsTrigger> : null}
          <TabsTrigger value="franchises">
            {competition.slug === "ncaa" ? "Programas" : "Franquias"}
          </TabsTrigger>
        </TabsList>

        {competition.hasStandings ? (
          <TabsContent value="standings" className="mt-0 space-y-3">
            {selectedSlice && !selectedSlice.hasStandings ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Sem classificação para {selectedSlice.seasonLabel} ainda. Escolhe a temporada
                passada no seletor acima — a estrutura 2026/27 já está pronta.
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
                Sem líderes para {selectedSlice.seasonLabel} ainda. A temporada passada já tem
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
                  ? "Jogos universitários — toque para abrir o box score."
                  : "Ao vivo, resultados e próximos jogos — abre a ficha para o box score."
              }
            />
          </TabsContent>
        ) : null}

        <TabsContent value="franchises" className="mt-0">
          <BasketballFranchisesBoard
            franchises={data.franchises}
            emptyLabel={
              competition.slug === "ncaa"
                ? "Nenhum programa NCAA no banco ainda. Rode o sync NCAA ou abra o diretório."
                : "Nenhuma franquia NBA no banco ainda."
            }
            directoryHref={`/teams?league=${competition.teamsLeagueParam}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
