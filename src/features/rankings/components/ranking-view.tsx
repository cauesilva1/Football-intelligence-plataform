import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { ScoutingPagination } from "@/features/scouting/components/scouting-pagination";
import { queryPlayers } from "@/features/scouting/queries/players";
import type { RankingPreset } from "@/features/rankings/lib/presets";
import { buttonVariants } from "@/components/ui/button";
import type { PlayerFilters } from "@/types";
import type { Sport } from "@/lib/sport";

export async function RankingView({
  preset,
  filters,
  sport,
}: {
  preset: RankingPreset;
  filters: PlayerFilters;
  sport: Sport;
}) {
  const effectiveFilters: PlayerFilters = {
    ...filters,
    sport,
    route: filters.route ?? "scouting",
  };
  const result = await queryPlayers(effectiveFilters);

  return (
    <div className="space-y-4">
      <PageHeader
        title={preset.title}
        description={preset.description}
        badge={
          <Link href="/rankings" className={buttonVariants({ variant: "outline", size: "xs" })}>
            All rankings
          </Link>
        }
      />

      {result.items.length === 0 ? (
        <EmptyState
          title="No players in this ranking."
          description="Explore the full database or adjust the scouting criteria."
          action={{ label: "View players", href: "/players" }}
        />
      ) : (
        <>
          <ScoutingTable
            players={result.items}
            filters={effectiveFilters}
            basePath={preset.href}
            route="scouting"
          />
          {result.totalPages > 1 && (
            <ScoutingPagination
              result={result}
              filters={effectiveFilters}
              basePath={preset.href}
              route="scouting"
            />
          )}
        </>
      )}
    </div>
  );
}
