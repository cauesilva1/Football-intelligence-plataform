"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PHASE_FILTER_OPTIONS, type PhaseFilterKey } from "@/lib/tournaments/types";

export function TournamentToolbar({
  phase,
  search,
  onPhaseChange,
  onSearchChange,
  visibleCount,
  totalCount,
}: {
  phase: PhaseFilterKey;
  search: string;
  onPhaseChange: (phase: PhaseFilterKey) => void;
  onSearchChange: (search: string) => void;
  visibleCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={phase}
          onChange={(e) => onPhaseChange(e.target.value as PhaseFilterKey)}
          className="sm:max-w-[220px]"
          aria-label="Filtrar por fase"
        >
          {PHASE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar seleção (ex: Arg, Brasil...)"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground sm:text-right">
        Exibindo <span className="font-semibold text-foreground">{visibleCount}</span> de{" "}
        <span className="font-semibold text-foreground">{totalCount}</span> jogos
      </p>
    </div>
  );
}
