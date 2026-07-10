import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { queryPlayerById } from "@/features/scouting/queries/players";
import { PlayerProfileView } from "@/features/scouting/components/player-profile-view";
import { PlayerProfileSkeleton } from "@/features/scouting/components/player-profile-skeleton";
import { APP_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await queryPlayerById(id);
  return {
    title: player ? `${player.knownAs} · ${APP_NAME}` : `Player Profile · ${APP_NAME}`,
  };
}

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const player = await queryPlayerById(id, query.season);

  return (
    <DashboardShell subtitle={player?.knownAs ?? "Player Profile"}>
      <Suspense fallback={<PlayerProfileSkeleton />}>
        <PlayerProfileView playerId={id} season={query.season} />
      </Suspense>
    </DashboardShell>
  );
}
