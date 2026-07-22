import { Suspense } from "react";
import { GitCompareArrows } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/common/empty-state";
import { queryAllPlayersLite } from "@/features/scouting/queries/players";
import { parseCompareParams } from "@/features/comparison/lib/parse-compare-params";
import { CompareSelectorForm } from "@/features/comparison/components/compare-selector-form";
import { ComparisonResult } from "@/features/comparison/components/comparison-result";
import { ComparisonResultSkeleton } from "@/features/comparison/components/comparison-result-skeleton";
import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Compare · ${APP_NAME}` };

export const revalidate = 300;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { playerA, playerB } = parseCompareParams(params);
  const bothSelected = Boolean(playerA && playerB);
  const selectedIds = [playerA, playerB].filter(Boolean);

  // Only hydrate selected players on the server — search is remote autocomplete.
  const playersLite = selectedIds.length
    ? await queryAllPlayersLite({ take: 1, ensureIds: selectedIds })
    : [];

  return (
    <DashboardShell subtitle="Compare">
      <div className="space-y-4">
        <ScoutWorkflowNav current="compare" />
        <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-6">
          <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">
            Compare players
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Side-by-side decision support — role-aware metrics and small-sample honesty from the
            profile.
          </p>
        </div>

        <CompareSelectorForm players={playersLite} playerA={playerA} playerB={playerB} />

        {!bothSelected && (
          <EmptyState
            icon={GitCompareArrows}
            title="Select two players"
            description="Choose a player in each field above to start a detailed comparison."
          />
        )}

        {bothSelected && (
          <Suspense key={`${playerA}-${playerB}`} fallback={<ComparisonResultSkeleton />}>
            <ComparisonResult playerA={playerA} playerB={playerB} />
          </Suspense>
        )}
      </div>
    </DashboardShell>
  );
}
