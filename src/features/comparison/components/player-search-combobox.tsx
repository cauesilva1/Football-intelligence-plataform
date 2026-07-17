"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchPlayersLiteAction } from "@/lib/actions/players";
import { cn } from "@/lib/utils";
import type { PlayerLite } from "@/types";

function formatPlayerLabel(player: PlayerLite): string {
  const club = player.teamName ?? player.teamShortName ?? "No club";
  return `${player.knownAs || player.fullName} - ${player.position} | ${club}`;
}

export function PlayerSearchCombobox({
  label,
  initialPlayers = [],
  value,
  excludeId,
  onChange,
  disabled,
}: {
  label: string;
  /** Seed options (usually the currently selected player). */
  initialPlayers?: PlayerLite[];
  value: string;
  excludeId?: string;
  onChange: (playerId: string, player?: PlayerLite) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerLite[]>(initialPlayers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResults((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      for (const p of initialPlayers) byId.set(p.id, p);
      return [...byId.values()];
    });
  }, [initialPlayers]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchPlayersLiteAction({
          search: query,
          take: 30,
          ensureIds: [value, excludeId].filter(Boolean) as string[],
        });
        if (!cancelled) {
          setResults(rows.filter((player) => player.id !== excludeId));
        }
      } catch {
        if (!cancelled) setResults(initialPlayers.filter((p) => p.id !== excludeId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, value, excludeId, initialPlayers]);

  const selected = useMemo(
    () =>
      results.find((player) => player.id === value) ??
      initialPlayers.find((player) => player.id === value),
    [results, initialPlayers, value]
  );

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-11 w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {selected ? formatPlayerLabel(selected) : "Search player..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,32rem)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : (
                <>
                  <CommandEmpty>No player found.</CommandEmpty>
                  <CommandGroup>
                    {results.map((player) => (
                      <CommandItem
                        key={player.id}
                        value={player.id}
                        onSelect={() => {
                          onChange(player.id, player);
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === player.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{formatPlayerLabel(player)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
