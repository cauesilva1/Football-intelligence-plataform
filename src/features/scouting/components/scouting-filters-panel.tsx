"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FilterBar, FilterField } from "@/components/data/filter-bar";
import { buildFilterUrl } from "@/features/scouting/lib/build-filter-url";
import { parsePlayerFilters, hasActiveFilters } from "@/features/scouting/lib/parse-filters";
import { getFilterDefaults, type ScoutingRoute } from "@/features/scouting/lib/filter-defaults";
import {
  BASKETBALL_POSITIONS,
  MIN_ASSISTS_OPTIONS,
  MIN_POINTS_OPTIONS,
  MIN_REBOUNDS_OPTIONS,
  MIN_THREE_PT_PCT_OPTIONS,
} from "@/features/scouting/lib/basketball-constants";
import { hasActiveBasketballFilters } from "@/features/scouting/lib/basketball-filters";
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
import { useSport } from "@/context/sport-context";
import type { PlayerFilters } from "@/types";

function nearestOption(options: readonly number[], value: number | undefined): number {
  if (typeof value !== "number") return options[0];
  return options.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

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
  const { currentSport } = useSport();
  const isBasketball = currentSport === "BASKETBALL";
  const defaults = getFilterDefaults(route, currentSport);

  const filters = useMemo(
    () => parsePlayerFilters(Object.fromEntries(searchParams.entries()), route, currentSport),
    [searchParams, route, currentSport]
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

  const toggleArchetype = useCallback(
    (archetype: NonNullable<PlayerFilters["archetype"]>) => {
      if (filters.archetype === archetype) {
        pushFilters({ archetype: undefined, page: 1 });
        return;
      }

      if (archetype === "three-and-d") {
        pushFilters({
          archetype,
          minThreePointsPercent: 38,
          minSteals: 1,
          page: 1,
        });
        return;
      }

      pushFilters({
        archetype,
        minBlocks: 1.5,
        position: undefined,
        page: 1,
      });
    },
    [filters.archetype, pushFilters]
  );

  const soccerAdvancedFields = (
    <>
      <FilterField label="Min Age">
        <Select
          value={String(filters.minAge ?? "")}
          onChange={(e) => pushFilters({ minAge: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">No limit</option>
          {MIN_AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}+ years</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Max Age">
        <Select
          value={String(filters.maxAge ?? "")}
          onChange={(e) => pushFilters({ maxAge: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">No limit</option>
          {MAX_AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>Max Age: {a}</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Min Rating">
        <Select
          value={String(filters.minRating ?? "")}
          onChange={(e) => pushFilters({ minRating: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">No limit</option>
          {MIN_RATING_OPTIONS.map((r) => (
            <option key={r} value={r}>{r.toFixed(1)}+</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Min Minutes">
        <Select
          value={String(filters.minMinutes ?? "")}
          onChange={(e) =>
            pushFilters({ minMinutes: e.target.value ? Number(e.target.value) : undefined, page: 1 })
          }
        >
          <option value="">No limit</option>
          {MIN_MINUTES_OPTIONS.filter((m) => m > 0).map((m) => (
            <option key={m} value={m}>{m}+ min</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Min Goals/90">
        <Select
          value={String(filters.minGoalsPer90 ?? "")}
          onChange={(e) =>
            pushFilters({ minGoalsPer90: e.target.value ? Number(e.target.value) : undefined, page: 1 })
          }
        >
          <option value="">No limit</option>
          {MIN_GOALS_PER90_OPTIONS.filter((v) => v > 0).map((v) => (
            <option key={v} value={v}>{v.toFixed(2)}+</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Min xG/90">
        <Select
          value={String(filters.minXGPer90 ?? "")}
          onChange={(e) =>
            pushFilters({ minXGPer90: e.target.value ? Number(e.target.value) : undefined, page: 1 })
          }
        >
          <option value="">No limit</option>
          {MIN_XG_PER90_OPTIONS.filter((v) => v > 0).map((v) => (
            <option key={v} value={v}>{v.toFixed(2)}+</option>
          ))}
        </Select>
      </FilterField>
    </>
  );

  const basketballAdvancedFields = (
    <>
      <FilterField label="PTS (mín.)">
        <Slider
          min={MIN_POINTS_OPTIONS[0]}
          max={MIN_POINTS_OPTIONS[MIN_POINTS_OPTIONS.length - 1]}
          step={1}
          value={nearestOption(MIN_POINTS_OPTIONS, filters.minPoints)}
          formatValue={(value) => (value > 0 ? `${value}+ PPG` : "Sem mínimo")}
          onValueChange={(value) =>
            pushFilters({ minPoints: value > 0 ? value : undefined, page: 1 })
          }
        />
      </FilterField>
      <FilterField label="REB (mín.)">
        <Slider
          min={MIN_REBOUNDS_OPTIONS[0]}
          max={MIN_REBOUNDS_OPTIONS[MIN_REBOUNDS_OPTIONS.length - 1]}
          step={1}
          value={nearestOption(MIN_REBOUNDS_OPTIONS, filters.minRebounds)}
          formatValue={(value) => (value > 0 ? `${value}+ RPG` : "Sem mínimo")}
          onValueChange={(value) =>
            pushFilters({ minRebounds: value > 0 ? value : undefined, page: 1 })
          }
        />
      </FilterField>
      <FilterField label="AST (mín.)">
        <Slider
          min={MIN_ASSISTS_OPTIONS[0]}
          max={MIN_ASSISTS_OPTIONS[MIN_ASSISTS_OPTIONS.length - 1]}
          step={1}
          value={nearestOption(MIN_ASSISTS_OPTIONS, filters.minAssists)}
          formatValue={(value) => (value > 0 ? `${value}+ APG` : "Sem mínimo")}
          onValueChange={(value) =>
            pushFilters({ minAssists: value > 0 ? value : undefined, page: 1 })
          }
        />
      </FilterField>
      <FilterField label="3P% (mín.)">
        <Slider
          min={MIN_THREE_PT_PCT_OPTIONS[0]}
          max={MIN_THREE_PT_PCT_OPTIONS[MIN_THREE_PT_PCT_OPTIONS.length - 1]}
          step={1}
          value={nearestOption(MIN_THREE_PT_PCT_OPTIONS, filters.minThreePointsPercent)}
          formatValue={(value) => (value > 0 ? `${value}%+` : "Sem mínimo")}
          onValueChange={(value) =>
            pushFilters({ minThreePointsPercent: value > 0 ? value : undefined, page: 1 })
          }
        />
      </FilterField>
    </>
  );

  const clearButton = (active: boolean) =>
    active ? (
      <div className="flex items-end">
        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" /> Limpar filtros
        </Button>
      </div>
    ) : null;

  const isScoutingRoute = route === "scouting";
  const showBasketballScoutingTools = isBasketball && isScoutingRoute;

  const advancedFields = isBasketball ? (
    showBasketballScoutingTools ? (
      <>
        {basketballAdvancedFields}
        {clearButton(hasActiveBasketballFilters(filters))}
      </>
    ) : null
  ) : (
    <>
      {soccerAdvancedFields}
      {clearButton(hasActiveFilters(filters))}
    </>
  );

  const positionOptions = isBasketball ? BASKETBALL_POSITIONS : POSITIONS;

  const archetypeBar = showBasketballScoutingTools ? (
    <div className="mb-3 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={filters.archetype === "three-and-d" ? "default" : "outline"}
        onClick={() => toggleArchetype("three-and-d")}
      >
        🎯 3&D Specialist
      </Button>
      <Button
        type="button"
        size="sm"
        variant={filters.archetype === "rim-protector" ? "default" : "outline"}
        onClick={() => toggleArchetype("rim-protector")}
      >
        🛡️ Rim Protector
      </Button>
    </div>
  ) : null;

  const hasBasicBasketballFilters = Boolean(
    filters.search ||
      filters.position ||
      filters.league ||
      filters.teamId
  );

  const playersClearButton =
    isBasketball && !isScoutingRoute && hasBasicBasketballFilters ? (
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" /> Limpar filtros
        </Button>
      </div>
    ) : null;

  return (
    <div>
      {archetypeBar}
      <FilterBar pending={isPending} footer={!isBasketball && route === "players" ? advancedFields : undefined}>
        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={isBasketball ? "Buscar jogador..." : "Search player by name..."}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </FilterField>
        <FilterField label="Position">
          <Select
            value={filters.position ?? ""}
            onChange={(e) => pushFilters({ position: e.target.value || undefined, page: 1 })}
          >
            <option value="">All</option>
            {positionOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="League">
          <Select
            value={filters.league ?? ""}
            onChange={(e) =>
              pushFilters({ league: e.target.value || undefined, teamId: undefined, page: 1 })
            }
          >
            <option value="">All</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={isBasketball ? "Franquia" : "Club"}>
          <Select
            value={filters.teamId ?? ""}
            onChange={(e) => pushFilters({ teamId: e.target.value || undefined, page: 1 })}
          >
            <option value="">All</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </FilterField>
        {isScoutingRoute && advancedFields}
      </FilterBar>
      {playersClearButton}
    </div>
  );
}
