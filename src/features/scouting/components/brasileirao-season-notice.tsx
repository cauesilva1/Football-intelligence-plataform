import { Badge } from "@/components/ui/badge";

export function BrasileiraoSeasonNotice({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 ${className ?? ""}`}
      role="status"
    >
      <Badge className="border-primary/40 bg-primary/20 text-primary hover:bg-primary/20">
        Temporada 2026 · Ao vivo
      </Badge>
      <p className="text-sm text-muted-foreground">
        Brasileirão Série A 2026 sincronizado via ESPN — tabela e jogos atualizados periodicamente.
      </p>
    </div>
  );
}
