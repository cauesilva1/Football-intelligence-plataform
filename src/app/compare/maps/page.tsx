import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/common/empty-state";
import { MapCompareForm } from "@/features/comparison/components/map-compare-form";
import { SoccerMapCompare } from "@/features/comparison/components/soccer-map-compare";
import {
  queryDefaultSoccerMapPair,
  querySoccerMapComparison,
  querySoccerMapPlayers,
} from "@/features/scouting/queries/soccer-map-compare";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Map compare · ${APP_NAME}` };
export const revalidate = 300;

function param(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export default async function SoccerMapComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const playerA = param(params.playerA);
  const playerB = param(params.playerB);
  const season = param(params.season);

  if (!playerA || !playerB) {
    const defaults = await queryDefaultSoccerMapPair({
      playerA: playerA || undefined,
      playerB: playerB || undefined,
      season: season || undefined,
    });
    if (defaults) {
      const next = new URLSearchParams({
        playerA: defaults.playerA,
        playerB: defaults.playerB,
        season: defaults.season,
      });
      redirect(`/compare/maps?${next.toString()}`);
    }
  }

  const players = playerA && playerB ? await querySoccerMapPlayers([playerA, playerB]) : [];
  const comparison = playerA && playerB ? await querySoccerMapComparison(playerA, playerB, season || undefined) : null;

  return (
    <DashboardShell subtitle="Compare maps">
      <div className="space-y-4">
        <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-6">
          <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">Effectiveness maps</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Side-by-side attacking halves for one shared season. Zone color and the grey floor under 5 attempts match the player map.
          </p>
        </div>

        <MapCompareForm players={players} playerA={playerA} playerB={playerB} season={comparison?.season || season || undefined} />

        {!playerA || !playerB || !comparison ? (
          <EmptyState
            icon="compare"
            title="No mapped pair yet"
            description="Tracked shots are still sparse. Open a player map once games have been ingested."
          />
        ) : (
          <SoccerMapCompare
            players={[comparison.players[0]!, comparison.players[1]!]}
            season={comparison.season}
            seasons={comparison.seasons}
            charts={comparison.charts}
          />
        )}
      </div>
    </DashboardShell>
  );
}
