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

export const metadata = { title: "Comparação · Football Intelligence Platform" };

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
    <DashboardShell subtitle="Comparação de jogadores" userName={session?.name}>
      <div className="space-y-6">
        <PageHeader
          title="Comparar jogadores"
          description="Análise lado a lado por categorias técnicas, radar e vantagens competitivas."
        />

        <CompareSelectorForm players={playersLite} playerA={playerA} playerB={playerB} />

        {!bothSelected && (
          <EmptyState
            title="Selecione dois jogadores"
            description="Escolha um jogador em cada campo acima para iniciar a comparação detalhada."
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
