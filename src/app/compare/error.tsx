"use client";

import { ErrorState } from "@/components/common/error-state";

export default function CompareError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Erro na comparação"
        description="Não foi possível carregar os dados dos jogadores selecionados."
        onRetry={reset}
      />
    </div>
  );
}
