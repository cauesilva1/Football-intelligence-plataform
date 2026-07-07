"use client";

import { ErrorState } from "@/components/common/error-state";

export default function ScoutingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Failed to load scouting database"
        description="Could not fetch players with the current filters."
        onRetry={reset}
      />
    </div>
  );
}
