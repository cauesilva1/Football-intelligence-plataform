"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { RemoveFromShortlistButton } from "@/features/shortlist/components/remove-from-shortlist-button";
import { getPlayersByIds } from "@/lib/actions/players-by-ids";
import {
  getShortlistEntries,
  setShortlistNote,
  setShortlistTag,
  SHORTLIST_CHANGED_EVENT,
  type ShortlistEntry,
  type ShortlistTag,
} from "@/lib/client/browser-storage";
import { cn } from "@/lib/utils";
import type { Player, PlayerFilters } from "@/types";

const TABLE_FILTERS: PlayerFilters = {
  sortBy: "rating",
  sortDir: "desc",
  page: 1,
  pageSize: 50,
};

const TAG_OPTIONS: {
  value: ShortlistTag;
  label: string;
  variant: "default" | "azure" | "amber" | "neutral";
}[] = [
  { value: "priority", label: "Priority", variant: "default" },
  { value: "watch", label: "Watch", variant: "azure" },
  { value: "reject", label: "Reject", variant: "neutral" },
];

const TAG_ORDER: ShortlistTag[] = ["priority", "watch", "reject"];

export function ShortlistView() {
  const [entries, setEntries] = useState<ShortlistEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [filterTag, setFilterTag] = useState<ShortlistTag | "all">("all");

  const loadShortlist = useCallback(async () => {
    const nextEntries = getShortlistEntries();
    setEntries(nextEntries);
    setDraftNotes(Object.fromEntries(nextEntries.map((e) => [e.playerId, e.note])));

    if (nextEntries.length === 0) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ids = nextEntries.map((e) => e.playerId);
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

  const entryById = useMemo(
    () => new Map(entries.map((e) => [e.playerId, e])),
    [entries]
  );

  const visiblePlayers = useMemo(() => {
    const filtered =
      filterTag === "all"
        ? players
        : players.filter((p) => (entryById.get(p.id)?.tag ?? "watch") === filterTag);
    return [...filtered].sort((a, b) => {
      const tagA = entryById.get(a.id)?.tag ?? "watch";
      const tagB = entryById.get(b.id)?.tag ?? "watch";
      const rank = TAG_ORDER.indexOf(tagA) - TAG_ORDER.indexOf(tagB);
      if (rank !== 0) return rank;
      return b.currentSeasonStats.rating - a.currentSeasonStats.rating;
    });
  }, [players, filterTag, entryById]);

  const tagCounts = useMemo(() => {
    const counts: Record<ShortlistTag | "all", number> = {
      all: players.length,
      priority: 0,
      watch: 0,
      reject: 0,
    };
    for (const p of players) {
      const tag = entryById.get(p.id)?.tag ?? "watch";
      counts[tag] += 1;
    }
    return counts;
  }, [players, entryById]);

  if (loading) {
    return (
      <div className="space-y-4">
        <ScoutWorkflowNav current="shortlist" />
        <PageHeader
          title="My Players"
          description="Working shortlist — tag targets, write notes, then generate a staff brief. Saved on this device."
        />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="space-y-4">
        <ScoutWorkflowNav current="shortlist" />
        <PageHeader
          title="My Players"
          description="Working shortlist — tag targets, write notes, then generate a staff brief. Saved on this device."
        />
        <EmptyState
          icon="bookmark"
          title="Your shortlist is empty"
          description="Save players from Scouting or a profile, then tag them Priority / Watch / Reject."
          action={{ label: "Open Scouting", href: "/scouting" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScoutWorkflowNav current="shortlist" />
      <PageHeader
        title="My Players"
        description={`${players.length} ${players.length === 1 ? "player" : "players"} saved on this device — tag, note, then open a scout brief.`}
      />

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { value: "all" as const, label: "All" },
            ...TAG_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilterTag(opt.value)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-2xs font-medium uppercase tracking-wide",
              filterTag === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label} ({tagCounts[opt.value]})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Working desk
        </p>
        {visiblePlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players with this tag.</p>
        ) : (
          visiblePlayers.map((p) => {
            const entry = entryById.get(p.id);
            const tag = entry?.tag ?? "watch";
            const s = p.currentSeasonStats;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card/60 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/players/${p.id}`}
                        className="font-display text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {p.knownAs}
                      </Link>
                      <Badge variant={TAG_OPTIONS.find((t) => t.value === tag)?.variant ?? "azure"}>
                        {tag}
                      </Badge>
                      <span className="text-2xs text-muted-foreground">
                        {p.position} · {p.teamName ?? "—"} · {s.rating.toFixed(1)} rating ·{" "}
                        {s.minutesPlayed.toLocaleString("en-US")}′
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {TAG_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setShortlistTag(p.id, opt.value);
                            void loadShortlist();
                          }}
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide",
                            tag === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      href={`/reports?playerId=${p.id}`}
                      className={buttonVariants({ variant: "default", size: "sm" })}
                    >
                      Generate brief
                    </Link>
                    <Link
                      href={`/compare?playerA=${p.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Compare
                    </Link>
                    <Link
                      href={`/players/${p.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Profile
                    </Link>
                    <RemoveFromShortlistButton playerId={p.id} onRemoved={loadShortlist} />
                  </div>
                </div>
                <textarea
                  value={draftNotes[p.id] ?? ""}
                  onChange={(e) =>
                    setDraftNotes((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  onBlur={() => {
                    setShortlistNote(p.id, draftNotes[p.id] ?? "");
                  }}
                  rows={2}
                  placeholder="Scout note — used as context when you open the brief…"
                  className="mt-3 w-full resize-y rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            );
          })
        )}
      </div>

      <details className="rounded-xl border border-border bg-card/40 open:pb-3">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Table view
        </summary>
        <div className="px-3 pt-1">
          <ScoutingTable
            players={visiblePlayers}
            filters={TABLE_FILTERS}
            basePath="/shortlist"
            route="players"
          />
        </div>
      </details>
    </div>
  );
}
