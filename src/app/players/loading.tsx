import { PlayersListSkeleton } from "@/features/scouting/components/players-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <PlayersListSkeleton />
    </div>
  );
}
