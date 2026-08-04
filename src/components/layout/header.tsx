"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { appConfig } from "@/lib/config";
import { useSport } from "@/context/sport-context";
import { sportLabel } from "@/lib/sport";
import { sportTheme } from "@/lib/sport-theme";
import { OmniScoutMark } from "@/components/icons/sport-balls";
import { SportSwitcher } from "./sport-switcher";
import { MobileHeaderMenu } from "./mobile-header-menu";

export function Header({ subtitle }: { subtitle?: string }) {
  const { currentSport } = useSport();
  const theme = sportTheme(currentSport);

  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center border-b border-border bg-background/95 px-3 py-2.5 md:px-8 md:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
        <Link href="/dashboard" className="shrink-0 md:hidden" aria-label={appConfig.name}>
          <OmniScoutMark sport={currentSport} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <p className="truncate font-display text-base font-semibold tracking-tight text-foreground md:text-lg">
              {subtitle ?? "Desk"}
            </p>
            <Badge
              variant="outline"
              className="hidden rounded-sm border-border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex"
              style={{ color: "hsl(var(--sport))", borderColor: "hsl(var(--sport) / 0.35)" }}
            >
              {sportLabel(currentSport)}
            </Badge>
          </div>
          <p className="truncate text-2xs text-muted-foreground md:text-xs">
            <span className="md:hidden">
              {theme.tagline} · {appConfig.season}
            </span>
            <span className="hidden md:inline">
              {appConfig.name} · {theme.tagline} · Season {appConfig.season}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          <SportSwitcher compact />
          <MobileHeaderMenu />
        </div>
      </div>
    </header>
  );
}
