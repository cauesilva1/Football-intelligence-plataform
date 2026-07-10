"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Calendar, ChevronDown, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useIsMounted } from "@/hooks/use-is-mounted";
import {
  fetchNbaGameLeaders,
  formatNbaGameDate,
  type NbaScheduleBundle,
  type NbaScheduleGame,
} from "@/lib/api/espn-nba-schedule";

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
      <span className={cn("ml-auto font-mono text-lg font-bold tabular-nums", won && "text-primary")}>{score}</span>
    </div>
  );
}

function GameCard({
  game,
  showLeaders,
}: {
  game: NbaScheduleGame;
  showLeaders?: boolean;
}) {
  const mounted = useIsMounted();
  const [expanded, setExpanded] = useState(false);
  const [leaders, setLeaders] = useState(game.leaders);
  const [isPending, startTransition] = useTransition();

  const homeWon = game.status === "final" && game.homeScore > game.awayScore;
  const awayWon = game.status === "final" && game.awayScore > game.homeScore;
  const localDate = mounted ? formatNbaGameDate(game.startTime) : "—";

  const loadLeaders = () => {
    if (!showLeaders || leaders) {
      setExpanded((value) => !value);
      return;
    }

    startTransition(async () => {
      const result = await fetchNbaGameLeaders(game.id);
      setLeaders(result);
      setExpanded(true);
    });
  };

  return (
    <Card className="border-border/70 bg-card/90 transition-all hover:border-primary/30">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {localDate}
          </span>
          <GameStatusBadge game={game} />
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

        {showLeaders ? (
          <button
            type="button"
            onClick={loadLeaders}
            className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-primary hover:underline"
          >
            {isPending ? "Carregando líderes..." : expanded ? "Ocultar líderes" : "Ver líderes da partida"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        ) : null}

        {expanded && leaders ? (
          <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            {(["away", "home"] as const).map((side) => (
              <div key={side}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {side === "home" ? game.homeAbbreviation : game.awayAbbreviation} Leaders
                </p>
                <div className="space-y-1.5">
                  {leaders[side].length ? (
                    leaders[side].map((leader) => (
                      <div key={leader.name} className="flex justify-between text-xs">
                        <span className="truncate text-foreground">{leader.name}</span>
                        <span className="font-mono text-muted-foreground">
                          {leader.points}P · {leader.rebounds}R · {leader.assists}A
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem dados</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GamesGrid({
  games,
  emptyLabel,
  showLeaders = false,
}: {
  games: NbaScheduleGame[];
  emptyLabel: string;
  showLeaders?: boolean;
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
        <GameCard key={game.id} game={game} showLeaders={showLeaders} />
      ))}
    </div>
  );
}

export function BasketballGamesHub({ schedule }: { schedule: NbaScheduleBundle }) {
  const defaultTab = useMemo(() => {
    if (schedule.live.length) return "live";
    if (schedule.scheduled.length) return "scheduled";
    return "past";
  }, [schedule]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Game Center</p>
        <h2 className="mt-1 font-display text-xl font-bold text-foreground">NBA Schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live, finalizados e próximos jogos via ESPN — horários no seu fuso local.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="live">Live ({schedule.live.length})</TabsTrigger>
          <TabsTrigger value="past">Passados ({schedule.past.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Agendados ({schedule.scheduled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <GamesGrid games={schedule.live} emptyLabel="Nenhum jogo ao vivo no momento." />
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          <GamesGrid games={schedule.past} emptyLabel="Nenhum jogo finalizado recente." showLeaders />
        </TabsContent>
        <TabsContent value="scheduled" className="mt-4">
          <GamesGrid games={schedule.scheduled} emptyLabel="Nenhum jogo agendado nos próximos dias." />
        </TabsContent>
      </Tabs>
    </section>
  );
}
