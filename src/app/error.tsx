"use client";

import { ErrorState } from "@/components/common/error-state";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDbError =
    error.message.includes("DATABASE_URL") ||
    error.message.includes("Supabase") ||
    error.message.includes("Can't reach database");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <ErrorState onRetry={reset} />
        {isDbError ? (
          <p className="text-xs text-muted-foreground">
            Check on Vercel: DATA_SOURCE=db, DATABASE_URL (pooler :6543 with schema=public) and
            DIRECT_URL (:5432).
          </p>
        ) : null}
        {error.digest ? (
          <p className="font-mono text-2xs text-muted-foreground">Digest: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
