"use client";

import { CircleDot, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSport } from "@/context/sport-context";
import type { Sport } from "@/lib/sport";

const OPTIONS: { value: Sport; label: string; icon: typeof Trophy }[] = [
  { value: "SOCCER", label: "Futebol", icon: Trophy },
  { value: "BASKETBALL", label: "Basquete", icon: CircleDot },
];

export function SportSwitcher({ compact = false }: { compact?: boolean }) {
  const { currentSport, setSport } = useSport();

  return (
    <div
      className={cn(
        "flex rounded-xl border border-border bg-card/80 p-1",
        compact ? "w-auto" : "w-full"
      )}
      role="tablist"
      aria-label="Alternar esporte"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = currentSport === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setSport(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg text-xs font-medium transition-all",
              compact ? "h-8 w-8 px-0" : "flex-1 px-2 py-2",
              active
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {!compact && <span>{label}</span>}
            {compact && <span className="sr-only">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
