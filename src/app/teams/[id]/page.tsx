import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeamDetailView } from "@/features/scouting/components/team-detail-view";
import { Skeleton } from "@/components/ui/skeleton";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <DashboardShell subtitle="Team Hub">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <TeamDetailView teamId={id} />
      </Suspense>
    </DashboardShell>
  );
}
