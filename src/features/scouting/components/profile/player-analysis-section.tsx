import { ShieldCheck, TrendingDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataPanel } from "@/components/data/data-panel";
import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import { deriveStrengthsWeaknesses } from "@/lib/metrics/player-enrichment";
import { localizeScoutLabels } from "@/lib/scout-labels";
import type { Player } from "@/types";

export function PlayerAnalysisSection({ player }: { player: Player }) {
  const style = derivePlayingStyle(player);
  const isSoccer = (player.sport ?? "SOCCER") === "SOCCER";
  const derived = isSoccer
    ? deriveStrengthsWeaknesses(player.currentSeasonStats, player.position)
    : null;
  const strengths = localizeScoutLabels(derived?.strengths ?? player.strengths);
  const weaknesses = localizeScoutLabels(derived?.weaknesses ?? player.weaknesses);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DataPanel
        title="Key Strengths"
        description="Highlighted attributes for scouting."
        density="dense"
        className="lg:col-span-1"
      >
        <ul className="space-y-2">
          {strengths.length === 0 ? (
            <li className="rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Not enough sample for strengths yet.
            </li>
          ) : (
            strengths.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
              >
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {item}
              </li>
            ))
          )}
        </ul>
      </DataPanel>

      <DataPanel
        title="Areas to Watch"
        description="Observed risks or limitations."
        density="dense"
        className="lg:col-span-1"
      >
        <ul className="space-y-2">
          {weaknesses.map((item) => (
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
        title="Playing Style"
        description="Tactical profile inferred from metrics."
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
