"use client";

import { ErrorState } from "@/components/common/error-state";

export default function ReportsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState title="Erro nos relatórios" description="Não foi possível carregar o gerador de scout reports." onRetry={reset} />
    </div>
  );
}
