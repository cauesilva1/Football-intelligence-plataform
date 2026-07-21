import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <ScoutingTableSkeleton rows={10} />
    </div>
  );
}
