import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeamDetailView } from "@/features/scouting/components/team-detail-view";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 300;

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  return (
    <DashboardShell subtitle="Team Hub">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <TeamDetailView teamId={id} season={query.season} />
      </Suspense>
    </DashboardShell>
  );
}
