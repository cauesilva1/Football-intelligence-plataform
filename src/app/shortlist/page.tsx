import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ShortlistView } from "@/features/shortlist/components/shortlist-view";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `My Players · ${APP_NAME}` };

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
