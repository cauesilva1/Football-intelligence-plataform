import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { getRankingPresets } from "@/features/rankings/lib/presets";
import type { Sport } from "@/lib/sport";

export function RankingsHub({ sport = "SOCCER" }: { sport?: Sport }) {
  const presets = getRankingPresets(sport);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {presets.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-xl border border-border bg-card p-4 shadow-panel transition-colors hover:border-primary/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              <p className="mt-2 flex items-center gap-1 text-2xs text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Top 20
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}
