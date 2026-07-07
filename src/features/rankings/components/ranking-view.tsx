import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { ScoutingPagination } from "@/features/scouting/components/scouting-pagination";
import { queryPlayers } from "@/features/scouting/queries/players";
import type { RankingPreset } from "@/features/rankings/lib/presets";
import { buttonVariants } from "@/components/ui/button";
import type { PlayerFilters } from "@/types";

export async function RankingView({
  preset,
  filters,
}: {
  preset: RankingPreset;
  filters: PlayerFilters;
}) {
  const result = await queryPlayers(filters);

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
          title="No players found in this ranking."
          description="Explore the full database or adjust scouting criteria."
          action={{ label: "View Players", href: "/players" }}
        />
      ) : (
        <>
          <ScoutingTable
            players={result.items}
            filters={filters}
            basePath={preset.href}
            route="scouting"
          />
          {result.totalPages > 1 && (
            <ScoutingPagination
              result={result}
              filters={filters}
              basePath={preset.href}
              route="scouting"
            />
          )}
        </>
      )}
    </div>
  );
}
