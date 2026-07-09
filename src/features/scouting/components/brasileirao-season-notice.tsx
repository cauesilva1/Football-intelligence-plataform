import { Badge } from "@/components/ui/badge";

export function BrasileiraoSeasonNotice({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 ${className ?? ""}`}
      role="status"
    >
      <Badge className="border-amber-400/60 bg-amber-500/20 text-amber-100 hover:bg-amber-500/20">
        Temporada 2025 — Histórica
      </Badge>
      <p className="text-sm text-amber-100/90">
        Dados finalizados da campanha 2025. A temporada 2026 será implementada em breve.
      </p>
    </div>
  );
}
