"use client";

import { ErrorState } from "@/components/common/error-state";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState onRetry={reset} />
    </div>
  );
}
