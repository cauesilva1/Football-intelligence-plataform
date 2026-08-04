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

export function SportSwitcher({
  compact = false,
  layout = "grid",
}: {
  compact?: boolean;
  /** `rail` = vertical stack for editorial sidebar (labels fade with collapse). */
  layout?: "grid" | "rail";
}) {
  const { currentSport, setSport, adoptSport } = useSport();
  const pathname = usePathname();
  const mounted = useIsMounted();
  const path =
    mounted && typeof window !== "undefined" ? window.location.pathname : pathname;
  const matchSport = matchSportFromPath(path);
  const activeIndex = Math.max(0, OPTIONS.indexOf(currentSport));
  const [popSport, setPopSport] = useState<Sport | null>(null);
  const prevSport = useRef(currentSport);
  const rail = layout === "rail";
  const iconsOnly = rail || compact;

  useEffect(() => {
    if (prevSport.current === currentSport) return;
    prevSport.current = currentSport;
    setPopSport(currentSport);
    const id = window.setTimeout(() => setPopSport(null), 400);
    return () => window.clearTimeout(id);
  }, [currentSport]);

  const tabClass = (value: Sport, active: boolean) =>
    cn(
      "relative z-[1] flex items-center gap-1.5 text-2xs font-medium transition-[color,background-color,padding,gap,min-height,justify-content] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
      rail && "editorial-sport-rail editorial-sport-compact min-h-[2.15rem] w-full justify-start rounded-sm px-2.5 py-1.5",
      compact && !rail && "h-8 w-8 justify-center rounded-sm px-0",
      !iconsOnly && "min-w-0 flex-col justify-center gap-1 rounded-sm px-1 py-2",
      active
        ? rail
          ? "is-active text-[#d6001c] bg-[rgba(214,0,28,0.06)]"
          : compact
            ? "text-[hsl(var(--sport))] bg-[hsl(var(--sport)/0.1)] ring-1 ring-[hsl(var(--sport)/0.3)]"
            : "text-[hsl(var(--sport))]"
        : "text-muted-foreground hover:text-foreground hover:bg-[#f3f4f6]"
    );

  return (
    <div
      className={cn(
        "relative",
        rail && "editorial-sport-rail-list flex w-full flex-col gap-0.5",
        compact && !rail && "flex w-auto gap-0.5 rounded-sm border border-border bg-card p-1",
        !iconsOnly && "grid w-full grid-cols-3 gap-0.5 rounded-sm border border-border bg-card p-1"
      )}
      role="tablist"
      aria-label="Switch sport"
    >
      {!iconsOnly && mounted ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 z-0 w-[calc((100%-0.5rem-0.25rem)/3)] rounded-sm bg-[hsl(var(--sport)/0.1)] ring-1 ring-[hsl(var(--sport)/0.22)] transition-[left] duration-350 ease-out"
          style={{
            left: `calc(0.25rem + ${activeIndex} * ((100% - 0.5rem - 0.25rem) / 3 + 0.125rem))`,
          }}
        />
      ) : null}

      {OPTIONS.map((value) => {
        const { label, shortLabel, icon: Icon } = SPORT_THEME[value];
        const active = currentSport === value;
        const onMatchPage = (path ?? "").startsWith("/matches/");
        const lockedSport = matchSport ?? currentSport;
        const leaveMatch = onMatchPage && value !== lockedSport;

        const content = (
          <>
            <Icon
              className={cn(
                "editorial-side-icon shrink-0 transition-transform duration-200",
                active && popSport === value && "sport-switcher-icon-active"
              )}
            />
            {rail ? (
              <span className="editorial-side-label truncate leading-none">{shortLabel}</span>
            ) : !iconsOnly ? (
              <span className="truncate leading-none">{shortLabel}</span>
            ) : null}
            <span className="sr-only">{label}</span>
          </>
        );

        const sharedProps = {
          role: "tab" as const,
          "aria-selected": active,
          "data-label": label,
          title: label,
          className: cn(tabClass(value, active), rail && "editorial-sport-compact"),
        };

        if (leaveMatch) {
          return (
            <a
              key={value}
              {...sharedProps}
              href="/tournaments"
              onClick={() => {
                adoptSport(value);
              }}
            >
              {content}
            </a>
          );
        }

        return (
          <button key={value} {...sharedProps} type="button" onClick={() => setSport(value)}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
