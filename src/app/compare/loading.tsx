import { ComparisonResultSkeleton } from "@/features/comparison/components/comparison-result-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <ComparisonResultSkeleton />
    </div>
  );
}
