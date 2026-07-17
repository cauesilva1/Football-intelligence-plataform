"use client";

import { cn } from "@/lib/utils";
import { useSport } from "@/context/sport-context";
import type { Sport } from "@/lib/sport";
import { SPORT_THEME } from "@/lib/sport-theme";

const OPTIONS: Sport[] = ["SOCCER", "BASKETBALL", "AMERICAN_FOOTBALL"];

export function SportSwitcher({ compact = false }: { compact?: boolean }) {
  const { currentSport, setSport } = useSport();

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/80 p-1",
        compact ? "flex w-auto" : "grid w-full grid-cols-3 gap-0.5"
      )}
      role="tablist"
      aria-label="Alternar esporte"
    >
      {OPTIONS.map((value) => {
        const { label, shortLabel, icon: Icon } = SPORT_THEME[value];
        const active = currentSport === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            title={label}
            onClick={() => setSport(value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium transition-all",
              compact ? "h-8 w-8 px-0" : "min-w-0 flex-col gap-1 px-1 py-2",
              active
                ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25"
                : cn(
                    "text-muted-foreground hover:bg-accent hover:text-foreground",
                    value === "SOCCER" && "hover:text-[hsl(142_71%_45%)]",
                    value === "BASKETBALL" && "hover:text-[hsl(24_95%_53%)]",
                    value === "AMERICAN_FOOTBALL" && "hover:text-[hsl(214_88%_52%)]"
                  )
            )}
          >
            <Icon className={cn("shrink-0", compact ? "h-4 w-4" : "h-4 w-4")} />
            {!compact && <span className="truncate leading-none">{shortLabel}</span>}
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
