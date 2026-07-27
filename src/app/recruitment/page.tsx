import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DataPanel } from "@/components/data/data-panel";
import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { RecruitmentHistoryPanel } from "@/features/recruitment/components/recruitment-history-panel";
import { RecruitmentResults } from "@/features/recruitment/components/recruitment-results";
import { RecruitmentSearchForm } from "@/features/recruitment/components/recruitment-search-form";
import { loadReplaceRecruitmentSeed } from "@/features/recruitment/lib/resolve-recruitment-brief";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/config";
import type { Sport } from "@/lib/sport";

export const metadata = { title: `Recruitment · ${APP_NAME}` };

function ResultsSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const replacePlayerId =
    typeof params.replacePlayerId === "string" ? params.replacePlayerId : undefined;
  const seed = replacePlayerId ? await loadReplaceRecruitmentSeed(replacePlayerId) : null;

  return (
    <DashboardShell subtitle="Recruitment">
      <div className="space-y-4">
        <ScoutWorkflowNav current="recruitment" />
        <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-6">
          <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">Recruitment</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ranked fit as decision support for soccer, basketball, and American football —
            including “replace this player” briefs from a profile. Not certainty.
          </p>
        </div>
        <Suspense fallback={<ResultsSkeleton />}>
          <RecruitmentSearchForm
            seedDefaults={
              seed
                ? {
                    ...seed.formDefaults,
                    sport: (seed.target.sport ?? "SOCCER") as Sport,
                    targetName: seed.target.knownAs || seed.target.fullName,
                  }
                : null
            }
          />
        </Suspense>
        <Suspense fallback={<ResultsSkeleton />}>
          <RecruitmentHistoryPanel />
        </Suspense>
        <DataPanel title="Ranked candidates" description="Server-scored list for your brief." density="dense">
          <Suspense fallback={<ResultsSkeleton />}>
            <RecruitmentResults searchParams={params} />
          </Suspense>
        </DataPanel>
      </div>
    </DashboardShell>
  );
}
