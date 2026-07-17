"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoccerStandingsTable } from "@/features/tournaments/soccer-standings-table";
import { SoccerGamesBoard } from "@/features/tournaments/soccer-games-board";
import { SoccerLeadersBoard } from "@/features/tournaments/soccer-leaders-board";
import type { SoccerCompetitionConfig } from "@/lib/tournaments/soccer-competitions";
import type { StandingGroup } from "@/lib/tournaments/competition-hub-data";
import type { CompetitionLeaders } from "@/lib/api/espn-leaders";
import type { TournamentMatch, TournamentRound } from "@/lib/tournaments/types";
import { TournamentView } from "@/features/tournaments/components/tournament-view";

export function SoccerCompetitionHub({
  competition,
  standings,
  matches,
  leaders,
  notice,
  historicalRounds,
}: {
  competition: SoccerCompetitionConfig;
  standings: StandingGroup[];
  matches: TournamentMatch[];
  leaders: CompetitionLeaders;
  notice?: string;
  historicalRounds?: Record<string, TournamentRound[]>;
}) {
  const hasHistorical =
    Boolean(historicalRounds) &&
    Object.keys(historicalRounds ?? {}).length > 0 &&
    (competition.editionIds?.length ?? 0) > 0;

  const hasLeaders =
    leaders.goals.length +
      leaders.assists.length +
      leaders.passes.length +
      leaders.yellowCards.length +
      leaders.redCards.length >
    0;

  return (
    <div className="space-y-6">
      <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-panel md:p-8">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Torneios
        </Link>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {competition.badge}
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-foreground md:text-3xl">
          {competition.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{competition.description}</p>
        {notice ? (
          <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            {notice}
          </p>
        ) : null}
      </div>

      <Tabs defaultValue="standings">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="standings">Tabela</TabsTrigger>
          <TabsTrigger value="leaders">Estatísticas</TabsTrigger>
          <TabsTrigger value="matches">Jogos</TabsTrigger>
          {hasHistorical ? <TabsTrigger value="editions">Temporadas</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="standings" className="mt-0">
          <SoccerStandingsTable groups={standings} />
        </TabsContent>

        <TabsContent value="leaders" className="mt-0">
          {hasLeaders ? (
            <SoccerLeadersBoard leaders={leaders} />
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Artilharia, passes e cartões ainda não disponíveis para esta competição.
            </p>
          )}
        </TabsContent>

        <TabsContent value="matches" className="mt-0">
          <SoccerGamesBoard matches={matches} />
        </TabsContent>

        {hasHistorical ? (
          <TabsContent value="editions" className="mt-0">
            <TournamentView
              roundsByTournament={historicalRounds ?? {}}
              tournamentIds={competition.editionIds}
              compact
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
