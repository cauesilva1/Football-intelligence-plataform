"use client";

import { ErrorState } from "@/components/common/error-state";

export default function TeamsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState title="Failed to load clubs" description="Could not fetch registered clubs." onRetry={reset} />
    </div>
  );
}
