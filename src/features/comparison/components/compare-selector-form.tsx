"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerSearchCombobox } from "@/features/comparison/components/player-search-combobox";
import { compareToSearchParams } from "@/features/comparison/lib/parse-compare-params";
import type { PlayerLite } from "@/types";

export function CompareSelectorForm({
  players,
  playerA,
  playerB,
}: {
  players: PlayerLite[];
  playerA: string;
  playerB: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pushSelection = useCallback(
    (a: string, b: string) => {
      const params = compareToSearchParams(a, b);
      const qs = params.toString();
      startTransition(() => router.push(qs ? `/compare?${qs}` : "/compare", { scroll: false }));
    },
    [router]
  );

  return (
    <Card className={isPending ? "opacity-70 transition-opacity" : ""}>
      <CardContent className="grid gap-4 p-5 md:grid-cols-2">
        <PlayerSearchCombobox
          label="Player A"
          initialPlayers={players}
          value={playerA}
          excludeId={playerB}
          onChange={(id) => pushSelection(id, playerB)}
          disabled={isPending}
        />
        <PlayerSearchCombobox
          label="Player B"
          initialPlayers={players}
          value={playerB}
          excludeId={playerA}
          onChange={(id) => pushSelection(playerA, id)}
          disabled={isPending}
        />
      </CardContent>
    </Card>
  );
}
