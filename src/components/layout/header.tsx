"use client";

import { Badge } from "@/components/ui/badge";
import { appConfig } from "@/lib/config";
import { useSport } from "@/context/sport-context";
import { sportLabel } from "@/lib/sport";
import { SportSwitcher } from "./sport-switcher";
import { SidebarLogo } from "./mobile-nav";

export function Header({ subtitle }: { subtitle?: string }) {
  const { currentSport } = useSport();

  return (
    <header className="relative sticky top-0 z-10 flex shrink-0 items-center border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-8 md:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <div className="md:hidden [&_a]:mb-0">
          <SidebarLogo />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-base font-semibold text-foreground md:text-lg">
              {subtitle ?? "Overview"}
            </p>
            <Badge variant="outline" className="hidden sm:inline-flex capitalize">
              {sportLabel(currentSport)}
            </Badge>
            {appConfig.dataSource === "mock" && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Demo
              </Badge>
            )}
            {appConfig.dataSource === "db" && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Supabase
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {appConfig.name} · {sportLabel(currentSport)} · Season {appConfig.season}
          </p>
        </div>
        <div className="w-44 shrink-0 md:hidden">
          <SportSwitcher compact />
        </div>
      </div>
    </header>
  );
}
