import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSession } from "@/lib/auth/session";
import { TeamDetailView } from "@/features/scouting/components/team-detail-view";
import { Skeleton } from "@/components/ui/skeleton";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()]);

  return (
    <DashboardShell subtitle="Team Hub" userName={session?.name}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <TeamDetailView teamId={id} />
      </Suspense>
    </DashboardShell>
  );
}
