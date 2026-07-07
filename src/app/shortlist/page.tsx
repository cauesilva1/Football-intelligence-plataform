import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth/session";
import { ShortlistView } from "@/features/shortlist/components/shortlist-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "My Players · Football Intelligence Platform" };

function ShortlistSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}

export default async function ShortlistPage() {
  const session = await getSession();

  return (
    <DashboardShell subtitle="My Players" userName={session?.name}>
      <Suspense fallback={<ShortlistSkeleton />}>
        <ShortlistView />
      </Suspense>
    </DashboardShell>
  );
}
