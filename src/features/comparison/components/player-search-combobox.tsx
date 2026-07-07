"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { PlayerLite } from "@/types";

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatPlayerLabel(player: PlayerLite): string {
  const club = player.teamName ?? player.teamShortName ?? "Sem clube";
  return `${player.knownAs || player.fullName} - ${player.position} | ${club}`;
}

function playerSearchBlob(player: PlayerLite): string {
  return normalizeSearch(
    [player.fullName, player.knownAs, player.position, player.teamName, player.teamShortName].join(" ")
  );
}

export function PlayerSearchCombobox({
  label,
  players,
  value,
  excludeId,
  onChange,
  disabled,
}: {
  label: string;
  players: PlayerLite[];
  value: string;
  excludeId?: string;
  onChange: (playerId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pool = useMemo(
    () => players.filter((player) => player.id !== excludeId),
    [players, excludeId]
  );

  const selected = useMemo(() => pool.find((player) => player.id === value), [pool, value]);

  const filtered = useMemo(() => {
    const term = normalizeSearch(query);
    if (!term) return pool.slice(0, 100);
    return pool.filter((player) => playerSearchBlob(player).includes(term)).slice(0, 100);
  }, [pool, query]);

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
              {selected ? formatPlayerLabel(selected) : "Buscar jogador..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,32rem)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Digite nome, posição ou clube..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Nenhum jogador encontrado.</CommandEmpty>
              <CommandGroup>
                {filtered.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={player.id}
                    onSelect={() => {
                      onChange(player.id);
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
