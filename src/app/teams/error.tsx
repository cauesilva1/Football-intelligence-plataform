"use client";

import { ErrorState } from "@/components/common/error-state";

export default function TeamsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState title="Erro ao carregar times" description="Não foi possível buscar os clubes cadastrados." onRetry={reset} />
    </div>
  );
}
