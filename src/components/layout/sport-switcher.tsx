"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSport } from "@/context/sport-context";
import type { Sport } from "@/lib/sport";
import { SPORT_THEME } from "@/lib/sport-theme";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { resolveSportFromMatchId } from "@/features/matches/resolve-match-sport";

const OPTIONS: Sport[] = ["SOCCER", "BASKETBALL", "AMERICAN_FOOTBALL"];

function matchSportFromPath(path: string | null): Sport | null {
  if (!path?.startsWith("/matches/")) return null;
  const raw = path.slice("/matches/".length).split("/")[0] ?? "";
  return raw ? resolveSportFromMatchId(raw) : null;
}

export function SportSwitcher({ compact = false }: { compact?: boolean }) {
  const { currentSport, setSport, adoptSport } = useSport();
  const pathname = usePathname();
  const mounted = useIsMounted();
  const path =
    mounted && typeof window !== "undefined" ? window.location.pathname : pathname;
  const matchSport = matchSportFromPath(path);
  const activeIndex = Math.max(0, OPTIONS.indexOf(currentSport));
  const [popSport, setPopSport] = useState<Sport | null>(null);
  const prevSport = useRef(currentSport);

  useEffect(() => {
    if (prevSport.current === currentSport) return;
    prevSport.current = currentSport;
    setPopSport(currentSport);
    const id = window.setTimeout(() => setPopSport(null), 400);
    return () => window.clearTimeout(id);
  }, [currentSport]);

  const tabClass = (value: Sport, active: boolean) =>
    cn(
      "relative z-[1] flex items-center justify-center gap-1.5 rounded-lg text-2xs font-medium transition-colors duration-200",
      compact ? "h-8 w-8 px-0" : "min-w-0 flex-col gap-1 px-1 py-2",
      active
        ? cn(
            "text-primary",
            compact &&
              "bg-primary/18 shadow-[0_0_16px_-4px_hsl(var(--sport-glow)/0.7)] ring-1 ring-primary/30"
          )
        : cn(
            "text-muted-foreground hover:text-foreground",
            value === "SOCCER" && "hover:text-[hsl(142_71%_45%)]",
            value === "BASKETBALL" && "hover:text-[hsl(24_95%_53%)]",
            value === "AMERICAN_FOOTBALL" && "hover:text-[hsl(214_88%_52%)]"
          )
    );

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border/80 bg-card/70 p-1 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)] backdrop-blur-sm",
        compact ? "flex w-auto" : "grid w-full grid-cols-3 gap-0.5"
      )}
      role="tablist"
      aria-label="Switch sport"
    >
      {!compact && mounted ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 z-0 w-[calc((100%-0.5rem-0.25rem)/3)] rounded-lg bg-primary/18 shadow-[0_0_20px_-4px_hsl(var(--sport-glow)/0.65)] ring-1 ring-primary/30 transition-[left] duration-350 ease-out"
          style={{
            left: `calc(0.25rem + ${activeIndex} * ((100% - 0.5rem - 0.25rem) / 3 + 0.125rem))`,
          }}
        />
      ) : null}

      {OPTIONS.map((value) => {
        const { label, shortLabel, icon: Icon } = SPORT_THEME[value];
        const active = currentSport === value;
        // Match pages are sport-specific — leave when picking a different sport.
        const onMatchPage = (path ?? "").startsWith("/matches/");
        const lockedSport = matchSport ?? currentSport;
        const leaveMatch = onMatchPage && value !== lockedSport;

        const content = (
          <>
            <Icon
              className={cn(
                "shrink-0 transition-transform duration-200",
                compact ? "h-4 w-4" : "h-4 w-4",
                active && popSport === value && "sport-switcher-icon-active"
              )}
            />
            {!compact && <span className="truncate leading-none">{shortLabel}</span>}
            <span className="sr-only">{label}</span>
          </>
        );

        if (leaveMatch) {
          return (
            <a
              key={value}
              href="/tournaments"
              role="tab"
              aria-selected={active}
              title={label}
              className={tabClass(value, active)}
              onClick={() => {
                adoptSport(value);
              }}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            title={label}
            onClick={() => setSport(value)}
            className={tabClass(value, active)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
