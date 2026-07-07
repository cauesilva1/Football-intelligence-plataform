"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterField } from "@/components/data/filter-bar";
import { buildFilterUrl } from "@/features/scouting/lib/build-filter-url";
import { parsePlayerFilters, hasActiveFilters } from "@/features/scouting/lib/parse-filters";
import { getFilterDefaults, type ScoutingRoute } from "@/features/scouting/lib/filter-defaults";
import type { LeagueOption } from "@/features/scouting/queries/filter-options";
import type { TeamOption } from "@/features/scouting/lib/teams-options";
import {
  MAX_AGE_OPTIONS,
  MIN_AGE_OPTIONS,
  MIN_RATING_OPTIONS,
  MIN_MINUTES_OPTIONS,
  MIN_GOALS_PER90_OPTIONS,
  MIN_XG_PER90_OPTIONS,
  POSITIONS,
} from "@/features/scouting/lib/constants";
import type { PlayerFilters } from "@/types";

export function ScoutingFiltersPanel({
  basePath,
  route,
  leagues,
  teams,
}: {
  basePath: string;
  route: ScoutingRoute;
  leagues: LeagueOption[];
  teams: TeamOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const defaults = getFilterDefaults(route);

  const filters = useMemo(
    () => parsePlayerFilters(Object.fromEntries(searchParams.entries()), route),
    [searchParams, route]
  );

  const [search, setSearch] = useState(filters.search ?? "");
  const teamOptions = useMemo(() => {
    if (!filters.league) return teams;
    return teams.filter((t) => t.leagueId === filters.league);
  }, [filters.league, teams]);

  useEffect(() => {
    setSearch(filters.search ?? "");
  }, [filters.search]);

  const pushFilters = useCallback(
    (next: Partial<PlayerFilters>) => {
      const merged = { ...filters, ...next, page: next.page ?? 1 };
      const url = buildFilterUrl(basePath, merged, defaults);
      startTransition(() => router.push(url, { scroll: false }));
    },
    [filters, router, basePath, defaults]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (filters.search ?? "")) {
        pushFilters({ search, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, filters.search, pushFilters]);

  const clearFilters = useCallback(() => {
    startTransition(() => router.push(basePath, { scroll: false }));
  }, [router, basePath]);

  const advancedFields = (
    <>
      <FilterField label="Idade mín.">
        <Select
          value={String(filters.minAge ?? "")}
          onChange={(e) => pushFilters({ minAge: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">Sem limite</option>
          {MIN_AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}+ anos</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Idade máx.">
        <Select
          value={String(filters.maxAge ?? "")}
          onChange={(e) => pushFilters({ maxAge: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">Sem limite</option>
          {MAX_AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>Até {a} anos</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Rating mín.">
        <Select
          value={String(filters.minRating ?? "")}
          onChange={(e) => pushFilters({ minRating: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">Sem limite</option>
          {MIN_RATING_OPTIONS.map((r) => (
            <option key={r} value={r}>{r.toFixed(1)}+</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Minutos mín.">
        <Select
          value={String(filters.minMinutes ?? "")}
          onChange={(e) =>
            pushFilters({ minMinutes: e.target.value ? Number(e.target.value) : undefined, page: 1 })
          }
        >
          <option value="">Sem limite</option>
          {MIN_MINUTES_OPTIONS.filter((m) => m > 0).map((m) => (
            <option key={m} value={m}>{m}+ min</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Gols/90 mín.">
        <Select
          value={String(filters.minGoalsPer90 ?? "")}
          onChange={(e) =>
            pushFilters({ minGoalsPer90: e.target.value ? Number(e.target.value) : undefined, page: 1 })
          }
        >
          <option value="">Sem limite</option>
          {MIN_GOALS_PER90_OPTIONS.filter((v) => v > 0).map((v) => (
            <option key={v} value={v}>{v.toFixed(2)}+</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="xG/90 mín.">
        <Select
          value={String(filters.minXGPer90 ?? "")}
          onChange={(e) =>
            pushFilters({ minXGPer90: e.target.value ? Number(e.target.value) : undefined, page: 1 })
          }
        >
          <option value="">Sem limite</option>
          {MIN_XG_PER90_OPTIONS.filter((v) => v > 0).map((v) => (
            <option key={v} value={v}>{v.toFixed(2)}+</option>
          ))}
        </Select>
      </FilterField>
      {hasActiveFilters(filters) && (
        <div className="flex items-end">
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        </div>
      )}
    </>
  );

  return (
    <FilterBar
      pending={isPending}
      footer={route === "players" ? advancedFields : undefined}
    >
      <FilterField label="Busca" className="min-w-[220px] flex-[2]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome do jogador..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterField>
      <FilterField label="Posição">
        <Select
          value={filters.position ?? ""}
          onChange={(e) => pushFilters({ position: e.target.value || undefined, page: 1 })}
        >
          <option value="">Todas</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Liga">
        <Select
          value={filters.league ?? ""}
          onChange={(e) =>
            pushFilters({ league: e.target.value || undefined, teamId: undefined, page: 1 })
          }
        >
          <option value="">Todas</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Clube">
        <Select
          value={filters.teamId ?? ""}
          onChange={(e) => pushFilters({ teamId: e.target.value || undefined, page: 1 })}
        >
          <option value="">Todos</option>
          {teamOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </FilterField>
      {route === "scouting" && advancedFields}
    </FilterBar>
  );
}
