import { ShieldCheck, TrendingDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataPanel } from "@/components/data/data-panel";
import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import type { Player } from "@/types";

export function PlayerAnalysisSection({ player }: { player: Player }) {
  const style = derivePlayingStyle(player);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DataPanel
        title="Pontos fortes"
        description="Atributos destacados para scouting."
        density="dense"
        className="lg:col-span-1"
      >
        <ul className="space-y-2">
          {player.strengths.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
            >
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      </DataPanel>

      <DataPanel
        title="Pontos de atenção"
        description="Riscos ou limitações observadas."
        density="dense"
        className="lg:col-span-1"
      >
        <ul className="space-y-2">
          {player.weaknesses.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
            >
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-negative" />
              {item}
            </li>
          ))}
        </ul>
      </DataPanel>

      <DataPanel
        title="Estilo de jogo"
        description="Perfil tático inferido das métricas."
        density="dense"
        className="lg:col-span-1"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-warning" />
            <p className="font-display text-sm font-semibold text-foreground">{style.label}</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{style.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {style.traits.map((trait) => (
              <Badge key={trait} variant="secondary">
                {trait}
              </Badge>
            ))}
          </div>
        </div>
      </DataPanel>
    </div>
  );
}
