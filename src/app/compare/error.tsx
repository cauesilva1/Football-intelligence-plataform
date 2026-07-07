"use client";

import { ErrorState } from "@/components/common/error-state";

export default function CompareError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Comparison failed"
        description="Could not load data for the selected players."
        onRetry={reset}
      />
    </div>
  );
}
