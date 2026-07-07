import type { PlayerFilters } from "@/types";
import { filtersToSearchParams } from "./parse-filters";

export function buildFilterUrl(pathname: string, filters: Partial<PlayerFilters>, defaults?: Partial<PlayerFilters>) {
  const params = filtersToSearchParams(filters, defaults);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
