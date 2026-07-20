"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { parseScoutingFilters } from "@/features/scouting/lib/parse-filters";
import { buildFilterUrl } from "@/features/scouting/lib/build-filter-url";
import {
  LEAGUES,
  MAX_AGE_OPTIONS,
  MIN_RATING_OPTIONS,
  POSITIONS,
} from "@/features/scouting/lib/constants";
import type { PlayerFilters } from "@/types";

export function ScoutingFiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const filters = parseScoutingFilters(Object.fromEntries(searchParams.entries()));

  const pushFilters = useCallback(
    (next: Partial<PlayerFilters>) => {
      const merged = { ...filters, ...next };
      const url = buildFilterUrl("/scouting", merged, { pageSize: 20, sortBy: "rating", sortDir: "desc" });
      startTransition(() => router.push(url, { scroll: false }));
    },
    [filters, router]
  );

  return (
    <Card className={isPending ? "opacity-70 transition-opacity" : ""}>
      <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Position</label>
          <Select
            value={filters.position ?? ""}
            onChange={(e) => pushFilters({ position: e.target.value || undefined })}
          >
            <option value="">Todas</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">League</label>
          <Select
            value={filters.league ?? ""}
            onChange={(e) => pushFilters({ league: e.target.value || undefined })}
          >
            <option value="">Todas</option>
            {LEAGUES.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Max age</label>
          <Select
            value={String(filters.maxAge ?? "")}
            onChange={(e) => pushFilters({ maxAge: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">No limit</option>
            {MAX_AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>Up to {a} years</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Min rating</label>
          <Select
            value={String(filters.minRating ?? "")}
            onChange={(e) => pushFilters({ minRating: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">No limit</option>
            {MIN_RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>{r.toFixed(1)}+</option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
