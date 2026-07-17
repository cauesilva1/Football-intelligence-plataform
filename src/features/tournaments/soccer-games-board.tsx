"use client";

import { useMemo } from "react";
import { Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchCard } from "@/features/tournaments/components/match-card";
import type { TournamentMatch } from "@/lib/tournaments/types";

function sortByDateAsc(a: TournamentMatch, b: TournamentMatch) {
  return (a.kickOff ?? a.date).localeCompare(b.kickOff ?? b.date);
}

function sortByDateDesc(a: TournamentMatch, b: TournamentMatch) {
  return (b.kickOff ?? b.date).localeCompare(a.kickOff ?? a.date);
}

export function SoccerGamesBoard({ matches }: { matches: TournamentMatch[] }) {
  const buckets = useMemo(() => {
    const live = matches.filter((m) => m.status === "live").sort(sortByDateAsc);
    const scheduled = matches.filter((m) => m.status === "scheduled").sort(sortByDateAsc);
    const finished = matches.filter((m) => m.status === "finished").sort(sortByDateDesc);
    return { live, scheduled, finished };
  }, [matches]);

  const defaultTab =
    buckets.live.length > 0 ? "live" : buckets.scheduled.length > 0 ? "scheduled" : "finished";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
        <TabsTrigger value="live">
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Live ({buckets.live.length})
          </span>
        </TabsTrigger>
        <TabsTrigger value="scheduled">Scheduled ({buckets.scheduled.length})</TabsTrigger>
        <TabsTrigger value="finished">Results ({buckets.finished.length})</TabsTrigger>
      </TabsList>

      {(["live", "scheduled", "finished"] as const).map((key) => (
        <TabsContent key={key} value={key} className="mt-0">
          {buckets[key].length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No games in this tab.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {buckets[key].map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
