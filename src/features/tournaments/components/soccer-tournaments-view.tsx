"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { TournamentRound } from "@/lib/tournaments/types";

const TournamentView = dynamic(
  () => import("@/features/tournaments/components/tournament-view").then((mod) => mod.TournamentView),
  {
    ssr: false,
    loading: () => (
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
    ),
  }
);

export default function SoccerTournamentsView({
  roundsByTournament,
}: {
  roundsByTournament: Record<string, TournamentRound[]>;
}) {
  return <TournamentView roundsByTournament={roundsByTournament} />;
}
