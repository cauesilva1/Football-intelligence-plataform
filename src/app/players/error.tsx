"use client";

import { ErrorState } from "@/components/common/error-state";

export default function PlayersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Failed to load players"
        description="Could not fetch the player list with the applied filters."
        onRetry={reset}
      />
    </div>
  );
}
