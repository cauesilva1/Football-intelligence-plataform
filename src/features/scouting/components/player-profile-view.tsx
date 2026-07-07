import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoutNotesPanel } from "@/features/scout-notes/components/scout-notes-panel";
import { queryPlayerById } from "@/features/scouting/queries/players";
import { PlayerProfileHeader } from "@/features/scouting/components/profile/player-profile-header";
import { PlayerPerformanceSection } from "@/features/scouting/components/profile/player-performance-section";
import { PlayerAnalysisSection } from "@/features/scouting/components/profile/player-analysis-section";
import { PlayerSimilarSection } from "@/features/scouting/components/profile/player-similar-section";
import { notFound } from "next/navigation";

function SimilarSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

export async function PlayerProfileView({ playerId }: { playerId: string }) {
  const player = await queryPlayerById(playerId);
  if (!player) notFound();

  return (
    <div className="space-y-6">
      <PlayerProfileHeader player={player} />
      <PlayerPerformanceSection player={player} />
      <PlayerAnalysisSection player={player} />
      <ScoutNotesPanel playerId={playerId} />
      <Suspense fallback={<SimilarSkeleton />}>
        <PlayerSimilarSection playerId={playerId} />
      </Suspense>
    </div>
  );
}
