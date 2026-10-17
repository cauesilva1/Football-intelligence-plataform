"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayerSearchCombobox } from "@/features/comparison/components/player-search-combobox";
import { compareToSearchParams } from "@/features/comparison/lib/parse-compare-params";
import { sportFromDeskParam } from "@/lib/sport-from-route";
import { cn } from "@/lib/utils";
import type { PlayerLite } from "@/types";

export function CompareSelectorForm({
  players,
  playerA,
  playerB,
  season,
  desk,
}: {
  players: PlayerLite[];
  playerA: string;
  playerB: string;
  season?: string;
  desk?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const sport = sportFromDeskParam(desk) ?? undefined;

  const pushSelection = useCallback(
    (a: string, b: string) => {
      const params = compareToSearchParams(a, b, season, desk);
      const qs = params.toString();
      startTransition(() => router.push(qs ? `/compare?${qs}` : "/compare", { scroll: false }));
    },
    [router, season, desk]
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-panel transition-opacity duration-150",
        isPending && "opacity-70"
      )}
    >
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr] md:items-end md:gap-3 md:p-5">
        <PlayerSearchCombobox
          label="Player A"
          initialPlayers={players}
          value={playerA}
          excludeId={playerB}
          onChange={(id) => pushSelection(id, playerB)}
          disabled={isPending}
          sport={sport}
        />
        <div
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted/50 font-mono text-2xs font-semibold uppercase tracking-wider text-muted-foreground md:flex"
          aria-hidden
        >
          vs
        </div>
        <PlayerSearchCombobox
          label="Player B"
          initialPlayers={players}
          value={playerB}
          excludeId={playerA}
          onChange={(id) => pushSelection(playerA, id)}
          disabled={isPending}
          sport={sport}
        />
      </div>
    </div>
  );
}
