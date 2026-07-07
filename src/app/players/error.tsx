"use client";

import { ErrorState } from "@/components/common/error-state";

export default function PlayersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Erro ao carregar jogadores"
        description="Não foi possível buscar a lista de jogadores com os filtros aplicados."
        onRetry={reset}
      />
    </div>
  );
}
