"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { AMERICAN_FOOTBALL_POSITIONS } from "@/lib/positions";
import { useSport } from "@/context/sport-context";
import type { PlayerFilters } from "@/types";
import {
  clearPlayerFilterPrefs,
  getPlayerFilterPrefs,
  savePlayerFilterPrefs,
  type StoredPlayerFilterPrefs,
} from "@/lib/client/browser-storage";

function nearestOption(options: readonly number[], value: number | undefined): number {
  if (typeof value !== "number") return options[0];
  return options.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

function urlHasMeaningfulParams(searchParams: URLSearchParams): boolean {
  for (const [key, value] of searchParams.entries()) {
    if (key === "page" && (value === "1" || value === "")) continue;
    if (value) return true;
  }
  return false;
}

function prefsFromFilters(filters: PlayerFilters): StoredPlayerFilterPrefs {
  return {
    search: filters.search || undefined,
    position: filters.position,
    league: filters.league,
    teamId: filters.teamId,
    minAge: filters.minAge,
    maxAge: filters.maxAge,
    minRating: filters.minRating,
    minMinutes: filters.minMinutes,
    minGoalsPer90: filters.minGoalsPer90,
    minXGPer90: filters.minXGPer90,
    maxMarketValue: filters.maxMarketValue,
    maxCapHit: filters.maxCapHit,
    minPoints: filters.minPoints,
    minRebounds: filters.minRebounds,
    minAssists: filters.minAssists,
    minThreePointsPercent: filters.minThreePointsPercent,
    minSteals: filters.minSteals,
    minBlocks: filters.minBlocks,
    archetype: filters.archetype,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    pageSize: filters.pageSize,
  };
}

function BasketballMetricSlider({
  label,
  options,
  value,
  formatValue,
  onCommit,
}: {
  label: string;
  options: readonly number[];
  value: number | undefined;
  formatValue: (value: number) => string;
  onCommit: (value: number | undefined) => void;
}) {
  const committed = nearestOption(options, value);
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  return (
    <FilterField label={label}>
      <Slider
        min={options[0]}
        max={options[options.length - 1]}
        step={1}
        value={draft}
        formatValue={formatValue}
        onValueChange={setDraft}
        onValueCommit={(next) => onCommit(next > 0 ? next : undefined)}
      />
    </FilterField>
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
  const isAmericanFootball = currentSport === "AMERICAN_FOOTBALL";
  const isFranchiseSport = isBasketball || isAmericanFootball;
  const defaults = getFilterDefaults(route, currentSport);
  const didRestorePrefs = useRef(false);

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
      savePlayerFilterPrefs(currentSport, route, prefsFromFilters(merged));
      const url = buildFilterUrl(basePath, merged, defaults);
      startTransition(() => router.push(url, { scroll: false }));
    },
    [filters, router, basePath, defaults, currentSport, route]
  );

  // Restore last filters when landing on a bare list URL.
  useEffect(() => {
    if (didRestorePrefs.current) return;
    if (urlHasMeaningfulParams(new URLSearchParams(searchParams.toString()))) {
      didRestorePrefs.current = true;
      return;
    }
    const saved = getPlayerFilterPrefs(currentSport, route);
    if (!saved || Object.keys(saved).length === 0) {
      didRestorePrefs.current = true;
      return;
    }
    didRestorePrefs.current = true;
    const merged = { ...filters, ...saved, page: 1 };
    const url = buildFilterUrl(basePath, merged, defaults);
    startTransition(() => router.replace(url, { scroll: false }));
  }, [searchParams, currentSport, route, filters, basePath, defaults, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (filters.search ?? "")) {
        pushFilters({ search, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, filters.search, pushFilters]);

  const clearFilters = useCallback(() => {
    clearPlayerFilterPrefs(currentSport, route);
    startTransition(() => router.push(basePath, { scroll: false }));
  }, [router, basePath, currentSport, route]);

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
      <BasketballMetricSlider
        label="PTS (min)"
        options={MIN_POINTS_OPTIONS}
        value={filters.minPoints}
        formatValue={(value) => (value > 0 ? `${value}+ PPG` : "No minimum")}
        onCommit={(value) => pushFilters({ minPoints: value, page: 1 })}
      />
      <BasketballMetricSlider
        label="REB (min)"
        options={MIN_REBOUNDS_OPTIONS}
        value={filters.minRebounds}
        formatValue={(value) => (value > 0 ? `${value}+ RPG` : "No minimum")}
        onCommit={(value) => pushFilters({ minRebounds: value, page: 1 })}
      />
      <BasketballMetricSlider
        label="AST (min)"
        options={MIN_ASSISTS_OPTIONS}
        value={filters.minAssists}
        formatValue={(value) => (value > 0 ? `${value}+ APG` : "No minimum")}
        onCommit={(value) => pushFilters({ minAssists: value, page: 1 })}
      />
      <BasketballMetricSlider
        label="3P% (min)"
        options={MIN_THREE_PT_PCT_OPTIONS}
        value={filters.minThreePointsPercent}
        formatValue={(value) => (value > 0 ? `${value}%+` : "No minimum")}
        onCommit={(value) => pushFilters({ minThreePointsPercent: value, page: 1 })}
      />
    </>
  );

  const clearButton = (active: boolean) =>
    active ? (
      <div className="flex items-end">
        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" /> Clear filters
        </Button>
      </div>
    ) : null;

  const americanFootballAdvancedFields = (
    <>
      <FilterField label="Min. age">
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
      <FilterField label="Max. age">
        <Select
          value={String(filters.maxAge ?? "")}
          onChange={(e) => pushFilters({ maxAge: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">No limit</option>
          {MAX_AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>Max. {a}</option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Min. rating">
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
    </>
  );

  const isScoutingRoute = route === "scouting";
  const showBasketballScoutingTools = isBasketball && isScoutingRoute;

  const advancedFields = isBasketball ? (
    showBasketballScoutingTools ? (
      <>
        {basketballAdvancedFields}
        {clearButton(hasActiveBasketballFilters(filters))}
      </>
    ) : null
  ) : isAmericanFootball ? (
    isScoutingRoute ? (
      <>
        {americanFootballAdvancedFields}
        {clearButton(hasActiveFilters(filters))}
      </>
    ) : null
  ) : (
    <>
      {soccerAdvancedFields}
      {clearButton(hasActiveFilters(filters))}
    </>
  );

  const positionOptions = isBasketball
    ? BASKETBALL_POSITIONS
    : isAmericanFootball
      ? AMERICAN_FOOTBALL_POSITIONS
      : POSITIONS;

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

  const hasBasicFranchiseFilters = Boolean(
    filters.search ||
      filters.position ||
      filters.league ||
      filters.teamId ||
      typeof filters.minAge === "number" ||
      typeof filters.maxAge === "number" ||
      typeof filters.minRating === "number"
  );

  const playersClearButton =
    isFranchiseSport && !isScoutingRoute && hasBasicFranchiseFilters ? (
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" /> Clear filters
        </Button>
      </div>
    ) : null;

  const teamFieldLabel = isBasketball
    ? "Franchise"
    : isAmericanFootball
      ? "Franchise / Program"
      : "Club";

  return (
    <div>
      {archetypeBar}
      <FilterBar pending={isPending} footer={!isFranchiseSport && route === "players" ? advancedFields : undefined}>
        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search player by name..."
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
        <FilterField label={teamFieldLabel}>
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
