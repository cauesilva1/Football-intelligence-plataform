"use client";

import { ErrorState } from "@/components/common/error-state";

export default function ScoutingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Erro ao carregar scouting"
        description="Não foi possível aplicar os filtros de scouting. Tente novamente."
        onRetry={reset}
      />
    </div>
  );
}
