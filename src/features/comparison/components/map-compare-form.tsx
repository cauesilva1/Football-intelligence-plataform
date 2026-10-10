"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayerSearchCombobox } from "@/features/comparison/components/player-search-combobox";
import { cn } from "@/lib/utils";
import type { PlayerLite } from "@/types";

function mapCompareHref(playerA: string, playerB: string, season?: string): string {
  const params = new URLSearchParams();
  if (playerA) params.set("playerA", playerA);
  if (playerB) params.set("playerB", playerB);
  if (season) params.set("season", season);
  const qs = params.toString();
  return qs ? `/compare/maps?${qs}` : "/compare/maps";
}

export function MapCompareForm({
  players,
  playerA,
  playerB,
  season,
}: {
  players: PlayerLite[];
  playerA: string;
  playerB: string;
  season?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pushSelection = useCallback(
    (a: string, b: string) => {
      startTransition(() => router.push(mapCompareHref(a, b, season), { scroll: false }));
    },
    [router, season]
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
          sport="SOCCER"
          onChange={(id) => pushSelection(id, playerB)}
          disabled={isPending}
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
          sport="SOCCER"
          onChange={(id) => pushSelection(playerA, id)}
          disabled={isPending}
        />
      </div>
    </div>
  );
}
