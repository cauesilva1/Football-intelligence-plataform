"use client";

import { ErrorState } from "@/components/common/error-state";

export default function ReportsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Reports error"
        description="Could not load the scout report generator."
        onRetry={reset}
      />
    </div>
  );
}
