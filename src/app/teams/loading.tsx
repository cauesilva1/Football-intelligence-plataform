import { TeamsGridSkeleton } from "@/features/scouting/components/teams-grid-skeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <TeamsGridSkeleton />
    </div>
  );
}
