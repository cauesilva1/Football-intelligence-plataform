import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { getSession } from "@/lib/auth/session";
import { queryAllPlayersLite } from "@/features/scouting/queries/players";
import { parseCompareParams } from "@/features/comparison/lib/parse-compare-params";
import { CompareSelectorForm } from "@/features/comparison/components/compare-selector-form";
import { ComparisonResult } from "@/features/comparison/components/comparison-result";
import { ComparisonResultSkeleton } from "@/features/comparison/components/comparison-result-skeleton";

export const metadata = { title: "Compare · Football Intelligence Platform" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params, playersLite] = await Promise.all([
    getSession(),
    searchParams,
    queryAllPlayersLite(),
  ]);

  const { playerA, playerB } = parseCompareParams(params);
  const bothSelected = Boolean(playerA && playerB);

  return (
    <DashboardShell subtitle="Player comparison" userName={session?.name}>
      <div className="space-y-6">
        <PageHeader
          title="Compare players"
          description="Side-by-side analysis by technical categories, radar chart, and competitive edges."
        />

        <CompareSelectorForm players={playersLite} playerA={playerA} playerB={playerB} />

        {!bothSelected && (
          <EmptyState
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
