import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ShortlistView } from "@/features/shortlist/components/shortlist-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "My Players · Football Intelligence Platform" };

function ShortlistSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}

export default async function ShortlistPage() {
  return (
    <DashboardShell subtitle="My Players">
      <Suspense fallback={<ShortlistSkeleton />}>
        <ShortlistView />
      </Suspense>
    </DashboardShell>
  );
}
