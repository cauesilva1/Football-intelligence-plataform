"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TOURNAMENTS } from "@/lib/statsbomb/constants";
import { STAGE_LABELS_PT } from "@/lib/statsbomb/constants";
import type { PhaseFilterKey, TournamentRound } from "@/lib/tournaments/types";
import { filterTournamentRounds } from "@/lib/tournaments/match-normalizer";
import { MatchCard } from "@/features/tournaments/components/match-card";
import { TournamentToolbar } from "@/features/tournaments/components/tournament-toolbar";
import { TournamentAttribution } from "@/features/tournaments/components/tournament-attribution";

function formatStageLabel(stageName: string): string {
  return STAGE_LABELS_PT[stageName] ?? stageName;
}

export function TournamentView({
  roundsByTournament,
}: {
  roundsByTournament: Record<string, TournamentRound[]>;
}) {
  const [activeId, setActiveId] = useState(TOURNAMENTS[0]?.id ?? "wc-2026");
  const [phase, setPhase] = useState<PhaseFilterKey>("all");
  const [search, setSearch] = useState("");

  const active = TOURNAMENTS.find((t) => t.id === activeId) ?? TOURNAMENTS[0];
  const allRounds = roundsByTournament[activeId] ?? [];

  const filteredRounds = useMemo(
    () => filterTournamentRounds(allRounds, phase, search),
    [allRounds, phase, search]
  );

  const totalCount = allRounds.reduce((sum, r) => sum + r.matches.length, 0);
  const visibleCount = filteredRounds.reduce((sum, r) => sum + r.matches.length, 0);

  const handleTabChange = (id: string) => {
    setActiveId(id);
    setPhase("all");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-6 shadow-panel md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Hub de Torneios</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
          Competições Internacionais
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Copa 2026 via scraper ESPN (JSON local) e arquivo histórico StatsBomb — filtros por fase e busca
          instantânea por seleção.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {TOURNAMENTS.map((tournament) => (
            <button
              key={tournament.id}
              type="button"
              onClick={() => handleTabChange(tournament.id)}
              className={cn(
                "rounded-lg border px-4 py-2 text-left transition-colors",
                activeId === tournament.id
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <span className="block text-sm font-semibold">{tournament.label}</span>
              <span className="block text-[11px] opacity-80">{tournament.description}</span>
            </button>
          ))}
        </div>
      </div>

      <TournamentToolbar
        phase={phase}
        search={search}
        onPhaseChange={setPhase}
        onSearchChange={setSearch}
        visibleCount={visibleCount}
        totalCount={totalCount}
      />

      {active ? (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{active.label}</span>
          {" · "}
          {totalCount} partidas
          {active.source === "scraped" ? (
            <span className="ml-2 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-400">
              JSON local
            </span>
          ) : active.source === "api-sports" ? (
            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Cache 15 min
            </span>
          ) : null}
        </div>
      ) : null}

      {filteredRounds.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum jogo encontrado para os filtros atuais.
        </p>
      ) : (
        filteredRounds.map((round) => (
          <section key={round.stageName} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg font-bold text-foreground">
                {formatStageLabel(round.stageName)}
              </h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {round.matches.length} jogos
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {round.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))
      )}

      {active ? <TournamentAttribution source={active.source} /> : null}
    </div>
  );
}
