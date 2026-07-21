"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, ChevronRight, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { SummerLeagueBadge } from "@/components/ui/summer-league-badge";
import {
  formatNbaGameDate,
  type NbaScheduleBundle,
  type NbaScheduleGame,
} from "@/lib/api/espn-nba-schedule";
import { basketballMatchExternalKey } from "@/lib/api/espn-nba-match-detail";

function GameStatusBadge({ game }: { game: NbaScheduleGame }) {
  if (game.status === "live") {
    return (
      <Badge className="animate-pulse border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
        <Radio className="mr-1 h-3 w-3" />
        {game.statusLabel}
      </Badge>
    );
  }
  if (game.status === "final") {
    return <Badge variant="secondary">{game.statusLabel}</Badge>;
  }
  return (
    <Badge variant="outline" className="border-primary/30 text-primary">
      {game.statusLabel}
    </Badge>
  );
}

function TeamLine({
  name,
  abbreviation,
  logo,
  score,
  won,
}: {
  name: string;
  abbreviation: string;
  logo?: string;
  score: number;
  won: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {logo ? (
        <Image src={logo} alt={name} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-2xs font-bold">
          {abbreviation}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-semibold", won ? "text-foreground" : "text-muted-foreground")}>
          {name}
        </p>
        <p className="text-2xs uppercase tracking-wider text-muted-foreground">{abbreviation}</p>
      </div>
      <span className={cn("ml-auto font-mono text-lg font-bold tabular-nums", won && "text-primary")}>{score}</span>
    </div>
  );
}

function matchHref(game: NbaScheduleGame): string {
  const competition =
    game.competition === "summer"
      ? "nba-summer"
      : game.competition === "ncaa"
        ? "ncaa"
        : "nba";
  return `/matches/${encodeURIComponent(basketballMatchExternalKey(competition, game.id))}`;
}

function GameCard({ game }: { game: NbaScheduleGame }) {
  const mounted = useIsMounted();
  const homeWon = game.status === "final" && game.homeScore > game.awayScore;
  const awayWon = game.status === "final" && game.awayScore > game.homeScore;
  const localDate = mounted ? formatNbaGameDate(game.startTime) : "—";
  const isSummer = game.competition === "summer";
  const isNcaa = game.competition === "ncaa";

  return (
    <Link href={matchHref(game)} className="block">
      <Card
        className={cn(
          "border-border/70 bg-card/90 transition-all hover:border-primary/30 hover:shadow-panel",
          game.status === "live" && "border-emerald-500/30 shadow-sm shadow-emerald-500/10"
        )}
      >
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {localDate}
            </span>
            <div className="flex items-center gap-2">
              {isSummer ? <SummerLeagueBadge /> : null}
              {isNcaa ? (
                <Badge variant="outline" className="border-border text-2xs text-muted-foreground">
                  NCAA
                </Badge>
              ) : null}
              <GameStatusBadge game={game} />
            </div>
          </div>

          <div className="space-y-3">
            <TeamLine
              name={game.awayTeam}
              abbreviation={game.awayAbbreviation}
              logo={game.awayLogo}
              score={game.awayScore}
              won={awayWon}
            />
            <TeamLine
              name={game.homeTeam}
              abbreviation={game.homeAbbreviation}
              logo={game.homeLogo}
              score={game.homeScore}
              won={homeWon}
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-primary">
            View game card
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function GamesGrid({
  games,
  emptyLabel,
}: {
  games: NbaScheduleGame[];
  emptyLabel: string;
}) {
  if (!games.length) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {games.map((game) => (
        <GameCard key={`${game.competition}:${game.id}`} game={game} />
      ))}
    </div>
  );
}

export function BasketballGamesHub({
  schedule,
  compact = false,
  title = "Agenda NBA",
  subtitle = "Live, recent results, and upcoming games — select one to open the full box score.",
}: {
  schedule: NbaScheduleBundle;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const defaultTab = schedule.live.length
    ? "live"
    : schedule.scheduled.length
      ? "scheduled"
      : "past";

  return (
    <section className="space-y-4">
      {!compact ? (
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary">
            Games hub
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {schedule.notice ? (
            <p className="mt-2 text-xs font-medium text-primary">{schedule.notice}</p>
          ) : null}
        </div>
      ) : schedule.notice ? (
        <p className="text-xs font-medium text-primary">{schedule.notice}</p>
      ) : null}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="live">Live ({schedule.live.length})</TabsTrigger>
          <TabsTrigger value="past">Results ({schedule.past.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({schedule.scheduled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <GamesGrid games={schedule.live} emptyLabel="No live games at the moment." />
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          <GamesGrid games={schedule.past} emptyLabel="No recent completed games." />
        </TabsContent>
        <TabsContent value="scheduled" className="mt-4">
          <GamesGrid
            games={schedule.scheduled}
            emptyLabel="No games scheduled in the coming days."
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
