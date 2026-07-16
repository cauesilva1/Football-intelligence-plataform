"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { appConfig } from "@/lib/config";
import { useSport } from "@/context/sport-context";
import { sportLabel } from "@/lib/sport";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { SportSwitcher } from "./sport-switcher";
import { MobileHeaderMenu } from "./mobile-header-menu";

export function Header({ subtitle }: { subtitle?: string }) {
  const { currentSport } = useSport();
  const mounted = useIsMounted();

  return (
    <header className="relative sticky top-0 z-10 flex shrink-0 items-center border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur-md md:px-8 md:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
        <Link
          href="/dashboard"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden"
          aria-label={appConfig.name}
        >
          <Sparkles className="h-4 w-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-display text-base font-semibold text-foreground md:text-lg">
              {subtitle ?? "Overview"}
            </p>
            <Badge variant="outline" className="hidden sm:inline-flex capitalize">
              {sportLabel(currentSport)}
            </Badge>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {mounted ? (appConfig.dataSource === "mock" ? "Demo" : "Supabase") : "—"}
            </Badge>
          </div>
          <p className="truncate text-[11px] text-muted-foreground md:text-xs">
            <span className="md:hidden">
              {sportLabel(currentSport)} · {appConfig.season}
            </span>
            <span className="hidden md:inline">
              {appConfig.name} · {sportLabel(currentSport)} · Season {appConfig.season}
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
