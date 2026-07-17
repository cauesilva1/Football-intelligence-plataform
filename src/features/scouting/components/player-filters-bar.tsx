"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { parsePlayerFilters } from "@/features/scouting/lib/parse-filters";
import { buildFilterUrl } from "@/features/scouting/lib/build-filter-url";
import {
  LEAGUES,
  MAX_AGE_OPTIONS,
  MIN_AGE_OPTIONS,
  MIN_RATING_OPTIONS,
  POSITIONS,
} from "@/features/scouting/lib/constants";
import type { PlayerFilters } from "@/types";

export function PlayerFiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = parsePlayerFilters(Object.fromEntries(searchParams.entries()));
  const [search, setSearch] = useState(filters.search ?? "");

  useEffect(() => {
    setSearch(filters.search ?? "");
  }, [filters.search]);

  const pushFilters = useCallback(
    (next: Partial<PlayerFilters>) => {
      const merged = { ...filters, ...next, page: next.page ?? 1 };
      const url = buildFilterUrl("/players", merged);
      startTransition(() => router.push(url, { scroll: false }));
    },
    [filters, router]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (filters.search ?? "")) {
        pushFilters({ search, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, filters.search, pushFilters]);

  return (
    <div
      className={`space-y-3 rounded-2xl border border-border bg-card p-4 transition-opacity ${isPending ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search player by name..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={filters.position ?? ""}
          onChange={(e) => pushFilters({ position: e.target.value || undefined, page: 1 })}
          className="w-36"
        >
          <option value="">Position</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>

        <Select
          value={filters.league ?? ""}
          onChange={(e) => pushFilters({ league: e.target.value || undefined, page: 1 })}
          className="w-44"
        >
          <option value="">Liga</option>
          {LEAGUES.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>

        <Select
          value={filters.sortBy ?? "rating"}
          onChange={(e) => pushFilters({ sortBy: e.target.value as PlayerFilters["sortBy"], page: 1 })}
          className="w-40"
        >
          <option value="rating">Ordenar: Rating</option>
          <option value="goals">Ordenar: Gols</option>
          <option value="assists">Sort: Assists</option>
          <option value="age">Ordenar: Idade</option>
          <option value="marketValue">Ordenar: Valor</option>
          <option value="name">Ordenar: Nome</option>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Advanced filters</span>
        <Select
          value={String(filters.minAge ?? "")}
          onChange={(e) => pushFilters({ minAge: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          className="w-36"
        >
          <option value="">Min age</option>
          {MIN_AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}+ anos</option>
          ))}
        </Select>
        <Select
          value={String(filters.maxAge ?? "")}
          onChange={(e) => pushFilters({ maxAge: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          className="w-36"
        >
          <option value="">Max age</option>
          {MAX_AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>Up to {a} years</option>
          ))}
        </Select>
        <Select
          value={String(filters.minRating ?? "")}
          onChange={(e) => pushFilters({ minRating: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          className="w-36"
        >
          <option value="">Min rating</option>
          {MIN_RATING_OPTIONS.map((r) => (
            <option key={r} value={r}>{r.toFixed(1)}+</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
