import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoutNotesPanel } from "@/features/scout-notes/components/scout-notes-panel";
import { queryPlayerById } from "@/features/scouting/queries/players";
import { PlayerProfileHeader } from "@/features/scouting/components/profile/player-profile-header";
import { PlayerPerformanceSection } from "@/features/scouting/components/profile/player-performance-section";
import { PlayerAnalysisSection } from "@/features/scouting/components/profile/player-analysis-section";
import { PlayerSimilarSection } from "@/features/scouting/components/profile/player-similar-section";
import { PlayerCompetitionContext } from "@/features/scouting/components/profile/player-competition-context";
import { ProfileBackButton } from "@/features/scouting/components/profile/profile-back-button";
import { AfProfileSeasonEnricher } from "@/features/scouting/components/profile/af-profile-season-enricher";
import { resolveFootballHubSeasonYears } from "@/lib/api/espn-football-seasons";
import type { Player } from "@/types";
import { notFound } from "next/navigation";

function SimilarSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

function playerNeedsAfSeasonEnrich(player: Player): boolean {
  if (player.sport !== "AMERICAN_FOOTBALL") return false;
  const { pastYear, currentYear } = resolveFootballHubSeasonYears();
  const pastKey = String(pastYear);
  const currentKey = String(currentYear);
  const past = player.history.find((row) => row.season === pastKey);
  const hasCurrentStub = player.availableSeasons.includes(currentKey);
  const pastHasSignal =
    !!past &&
    ((past.points ?? 0) > 0 ||
      past.goals > 0 ||
      (past.sacks ?? 0) > 0 ||
      (past.steals ?? 0) > 0 ||
      (past.totalYards ?? 0) > 0 ||
      (past.touchdowns ?? 0) > 0 ||
      (past.passingYards ?? 0) > 0 ||
      (past.rushingYards ?? 0) > 0 ||
      (past.receivingYards ?? 0) > 0);
  return !hasCurrentStub || !past || !pastHasSignal;
}

export async function PlayerProfileView({
  playerId,
  season,
}: {
  playerId: string;
  season?: string;
}) {
  const player = await queryPlayerById(playerId, season);
  if (!player) notFound();

  return (
    <div className="space-y-6">
      <ProfileBackButton />
      <AfProfileSeasonEnricher
        playerId={playerId}
        enabled={playerNeedsAfSeasonEnrich(player)}
      />
      <PlayerProfileHeader player={player} />
      <PlayerPerformanceSection player={player} />
      <PlayerCompetitionContext player={player} />
      <PlayerAnalysisSection player={player} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ScoutNotesPanel playerId={playerId} />
        <Suspense fallback={<SimilarSkeleton />}>
          <PlayerSimilarSection playerId={playerId} />
        </Suspense>
      </div>
    </div>
  );
}
