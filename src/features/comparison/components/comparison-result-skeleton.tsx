import { Skeleton } from "@/components/ui/skeleton";

export function ComparisonResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-36 rounded-xl" />
    </div>
  );
}
