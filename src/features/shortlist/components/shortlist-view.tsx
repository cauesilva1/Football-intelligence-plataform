"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { RemoveFromShortlistButton } from "@/features/shortlist/components/remove-from-shortlist-button";
import { getPlayersByIds } from "@/lib/actions/players-by-ids";
import {
  getShortlistIds,
  SHORTLIST_CHANGED_EVENT,
} from "@/lib/client/browser-storage";
import type { Player, PlayerFilters } from "@/types";

const TABLE_FILTERS: PlayerFilters = {
  sortBy: "rating",
  sortDir: "desc",
  page: 1,
  pageSize: 50,
};

export function ShortlistView() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShortlist = useCallback(async () => {
    const ids = getShortlistIds();
    if (ids.length === 0) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getPlayersByIds(ids);
      const order = new Map(ids.map((id, index) => [id, index]));
      result.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      setPlayers(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShortlist();

    const onChange = () => void loadShortlist();
    window.addEventListener(SHORTLIST_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SHORTLIST_CHANGED_EVENT, onChange);
  }, [loadShortlist]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your shortlist...</p>;
  }

  if (players.length === 0) {
    return (
      <>
        <PageHeader
          title="My Players"
          description="Your personal shortlist of monitored players."
        />
        <EmptyState
          title="Empty shortlist"
          description="Save players from their profile to track prospects and scouting targets."
          action={{ label: "Browse Players", href: "/players" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My Players"
        description={`${players.length} player(s) in your personal shortlist.`}
      />
      <div className="space-y-3">
        <ScoutingTable
          players={players}
          filters={TABLE_FILTERS}
          basePath="/shortlist"
          route="players"
        />
        <p className="text-2xs text-muted-foreground">
          Tip: use &quot;Remove&quot; on the player profile or the buttons below on each row.
        </p>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-xs"
            >
              <Link href={`/players/${p.id}`} className="text-foreground hover:text-primary">
                {p.knownAs}
              </Link>
              <RemoveFromShortlistButton playerId={p.id} onRemoved={loadShortlist} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
