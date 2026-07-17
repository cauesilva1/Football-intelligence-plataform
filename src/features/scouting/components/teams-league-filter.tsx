"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { TeamLeagueTab } from "@/features/scouting/lib/team-league-filters";

export function TeamsLeagueFilter({
  tabs,
  totalCount,
  visibleCount,
  entityLabel = "clubes",
}: {
  tabs: TeamLeagueTab[];
  totalCount: number;
  visibleCount: number;
  entityLabel?: string;
}) {
  const searchParams = useSearchParams();
  const leagueParam = searchParams.get("league");
  const activeKey =
    tabs.find((t) => t.key === leagueParam)?.key ??
    tabs.find((t) => t.competitionId === leagueParam)?.key ??
    "all";

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Mostrando{" "}
          <span className="font-semibold text-foreground">{visibleCount}</span> de{" "}
          <span className="font-semibold text-foreground">{totalCount}</span> {entityLabel}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={`Filtrar ${entityLabel} por liga`}>
        {tabs.map((tab) => {
          const href = tab.key === "all" ? "/teams" : `/teams?league=${tab.key}`;
          const isActive = activeKey === tab.key;

          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              aria-selected={isActive}
              prefetch={false}
              className={cn(
                "rounded-lg border px-4 py-2 text-left text-xs font-semibold transition-colors",
                isActive
                  ? "border-primary/50 bg-primary/10 text-foreground shadow-sm"
                  : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
