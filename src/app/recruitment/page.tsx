import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DataPanel } from "@/components/data/data-panel";
import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { RecruitmentHistoryPanel } from "@/features/recruitment/components/recruitment-history-panel";
import { RecruitmentResults } from "@/features/recruitment/components/recruitment-results";
import { RecruitmentSearchForm } from "@/features/recruitment/components/recruitment-search-form";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/config";

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

  return (
    <DashboardShell subtitle="Recruitment">
      <div className="space-y-4">
        <ScoutWorkflowNav current="recruitment" />
        <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-panel md:p-6">
          <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">Recruitment</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Headless fit engine with ranked candidates for soccer, basketball, and American
            football — decision support, not certainty. Switch sport in the shell to change the
            brief vocabulary.
          </p>
        </div>
        <Suspense fallback={<ResultsSkeleton />}>
          <RecruitmentSearchForm />
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
