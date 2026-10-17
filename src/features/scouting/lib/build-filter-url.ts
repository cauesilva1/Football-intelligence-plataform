import { deskParamForSport } from "@/lib/sport-from-route";
import type { PlayerFilters } from "@/types";
import { filtersToSearchParams } from "./parse-filters";

export function buildFilterUrl(pathname: string, filters: Partial<PlayerFilters>, defaults?: Partial<PlayerFilters>) {
  const params = filtersToSearchParams(filters, defaults);
  if (filters.sport && !params.has("desk")) {
    params.set("desk", deskParamForSport(filters.sport));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
