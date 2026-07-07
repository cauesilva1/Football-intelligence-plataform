import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSession } from "@/lib/auth/session";
import { queryPlayerById } from "@/features/scouting/queries/players";
import { PlayerProfileView } from "@/features/scouting/components/player-profile-view";
import { PlayerProfileSkeleton } from "@/features/scouting/components/player-profile-skeleton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await queryPlayerById(id);
  return {
    title: player ? `${player.knownAs} · Football Intelligence Platform` : "Perfil do jogador · Football Intelligence Platform",
  };
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const player = await queryPlayerById(id);

  return (
    <DashboardShell subtitle={player?.knownAs ?? "Perfil do jogador"} userName={session?.name}>
      <Suspense fallback={<PlayerProfileSkeleton />}>
        <PlayerProfileView playerId={id} />
      </Suspense>
    </DashboardShell>
  );
}
