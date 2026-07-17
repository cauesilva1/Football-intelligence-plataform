"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useIsMounted } from "@/hooks/use-is-mounted";
import {
  formatFootballGameDate,
  type FootballScheduleBundle,
  type FootballScheduleGame,
} from "@/lib/api/espn-football-schedule";

function footballMatchExternalKey(competition: "nfl" | "cfb", gameId: string): string {
  return `espn:${competition}:${gameId}`;
}

function GameStatusBadge({ game }: { game: FootballScheduleGame }) {
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
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">
          {abbreviation}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-semibold", won ? "text-foreground" : "text-muted-foreground")}>
          {name}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{abbreviation}</p>
      </div>
      <span className={cn("ml-auto font-mono text-lg font-bold tabular-nums", won && "text-primary")}>
        {score}
      </span>
    </div>
  );
}

function GameCard({ game }: { game: FootballScheduleGame }) {
  const mounted = useIsMounted();
  const homeWon = game.status === "final" && game.homeScore > game.awayScore;
  const awayWon = game.status === "final" && game.awayScore > game.homeScore;
  const localDate = mounted ? formatFootballGameDate(game.startTime) : "—";

  return (
    <Link
      href={`/matches/${encodeURIComponent(footballMatchExternalKey(game.competition, game.id))}`}
      className="block"
    >
      <Card
        className={cn(
          "border-border/70 bg-card/90 transition-all hover:border-primary/30 hover:shadow-panel",
          game.status === "live" && "border-emerald-500/30 shadow-sm shadow-emerald-500/10"
        )}
      >
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {localDate}
            </span>
            <GameStatusBadge game={game} />
          </div>
          <div className="space-y-2">
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
        </CardContent>
      </Card>
    </Link>
  );
}

function GameList({ games, empty }: { games: FootballScheduleGame[]; empty: string }) {
  if (!games.length) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

export function AmericanFootballGamesHub({
  schedule,
  title = "Agenda",
  subtitle,
  compact = false,
}: {
  schedule: FootballScheduleBundle;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const defaultTab =
    schedule.live.length > 0 ? "live" : schedule.scheduled.length > 0 ? "upcoming" : "past";

  return (
    <div className={cn("space-y-4", !compact && "space-y-6")}>
      {!compact ? (
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      ) : null}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="live">Live ({schedule.live.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({schedule.scheduled.length})</TabsTrigger>
          <TabsTrigger value="past">Results ({schedule.past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="mt-0">
          <GameList games={schedule.live} empty="No live games at the moment." />
        </TabsContent>
        <TabsContent value="upcoming" className="mt-0">
          <GameList games={schedule.scheduled} empty="No games scheduled in this window." />
        </TabsContent>
        <TabsContent value="past" className="mt-0">
          <GameList games={schedule.past} empty="No recent results in this window." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { footballMatchExternalKey };
