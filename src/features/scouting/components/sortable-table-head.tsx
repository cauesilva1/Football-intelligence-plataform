"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildFilterUrl } from "@/features/scouting/lib/build-filter-url";
import { getFilterDefaults, type ScoutingRoute } from "@/features/scouting/lib/filter-defaults";
import type { PlayerFilters } from "@/types";

export function SortableTableHead({
  label,
  sortKey,
  filters,
  basePath,
  route,
  className,
}: {
  label: string;
  sortKey: NonNullable<PlayerFilters["sortBy"]>;
  filters: PlayerFilters;
  basePath: string;
  route: ScoutingRoute;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaults = getFilterDefaults(route);
  const active = filters.sortBy === sortKey;
  const dir = active ? filters.sortDir : undefined;

  const handleSort = useCallback(() => {
    const nextDir = active && filters.sortDir === "desc" ? "asc" : "desc";
    const url = buildFilterUrl(
      basePath,
      { ...filters, sortBy: sortKey, sortDir: nextDir, page: 1 },
      defaults
    );
    startTransition(() => router.push(url, { scroll: false }));
  }, [active, basePath, defaults, filters, router, sortKey]);

  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={handleSort}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        isPending && "opacity-70",
        className
      )}
    >
      {label}
      <Icon className="h-3 w-3 shrink-0" />
    </button>
  );
}
