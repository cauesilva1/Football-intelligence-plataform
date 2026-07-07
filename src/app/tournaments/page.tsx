import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TournamentView } from "@/features/tournaments/components/tournament-view";
import { fetchStatsBombMatches } from "@/lib/statsbomb/fetch-matches";
import { TOURNAMENTS } from "@/lib/statsbomb/constants";
import { loadWorldCup2026Matches } from "@/lib/tournaments/world-cup-2026";
import {
  fromStatsBombMatch,
  groupTournamentMatches,
} from "@/lib/tournaments/match-normalizer";
import { enrichTournamentRoundsWithCrests } from "@/lib/tournaments/enrich-crests";
import type { TournamentRound } from "@/lib/tournaments/types";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Tournaments · Football Intelligence Platform" };

async function TournamentData() {
  const roundsByTournament: Record<string, TournamentRound[]> = {};

  await Promise.all(
    TOURNAMENTS.map(async (tournament) => {
      try {
        if (tournament.source === "scraped") {
          const raw = await loadWorldCup2026Matches();
          const matches = raw.map((m) => fromStatsBombMatch(m, "scraped"));
          const rounds = groupTournamentMatches(matches);
          roundsByTournament[tournament.id] = await enrichTournamentRoundsWithCrests(rounds);
          return;
        }

        if (tournament.competitionId != null && tournament.seasonId != null) {
          const raw = await fetchStatsBombMatches(tournament.competitionId, tournament.seasonId);
          const matches = raw.map((m) => fromStatsBombMatch(m));
          const rounds = groupTournamentMatches(matches);
          roundsByTournament[tournament.id] = await enrichTournamentRoundsWithCrests(rounds);
        }
      } catch (error) {
        console.warn(`[tournaments] Falha ao carregar ${tournament.id}:`, error);
        roundsByTournament[tournament.id] = [];
      }
    })
  );

  return <TournamentView roundsByTournament={roundsByTournament} />;
}

function TournamentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function TournamentsPage() {
  return (
    <DashboardShell subtitle="Tournaments">
      <Suspense fallback={<TournamentSkeleton />}>
        <TournamentData />
      </Suspense>
    </DashboardShell>
  );
}
