import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NhlScheduleGame, NhlStandingRow } from "@/lib/api/nhl";
import type { HockeyCompetitionConfig } from "@/lib/tournaments/hockey-competitions";

function GameCard({ game }: { game: NhlScheduleGame }) {
  const final = game.status === "final";
  const homeWon = final && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = final && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const when = game.startTime
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
        new Date(game.startTime)
      )
    : "Time TBD";

  return (
    <Card className="cursor-default">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-2xs uppercase tracking-wider text-muted-foreground">
          <span>{when}</span>
          {game.status === "live" ? (
            <Badge className="animate-pulse border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
              <Radio className="mr-1 h-3 w-3" />
              Live
            </Badge>
          ) : (
            <Badge variant={final ? "secondary" : "outline"}>{game.statusLabel}</Badge>
          )}
        </div>
        {[
          { name: game.awayName, abbrev: game.awayAbbrev, logo: game.awayLogo, score: game.awayScore, won: awayWon },
          { name: game.homeName, abbrev: game.homeAbbrev, logo: game.homeLogo, score: game.homeScore, won: homeWon },
        ].map((team) => (
          <div key={team.abbrev} className="flex items-center gap-2">
            {team.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logo} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-2xs font-bold">
                {team.abbrev.slice(0, 3)}
              </span>
            )}
            <span className={team.won ? "font-semibold" : "text-muted-foreground"}>{team.name}</span>
            <span className="ml-auto font-mono text-lg font-bold tabular-nums">
              {final || game.status === "live" ? team.score ?? "—" : ""}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StandingsTable({ rows }: { rows: NhlStandingRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Standings are not available yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-surface-muted text-left text-2xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {["Club", "Div", "GP", "W", "L", "OT", "PTS", "GF", "GA"].map((label) => (
              <th key={label} className="px-3 py-2 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows
            .slice()
            .sort((a, b) => b.points - a.points)
            .map((row) => (
              <tr key={row.abbrev} className="border-t">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.division}</td>
                <td className="px-3 py-2 tabular-nums">{row.gamesPlayed}</td>
                <td className="px-3 py-2 tabular-nums">{row.wins}</td>
                <td className="px-3 py-2 tabular-nums">{row.losses}</td>
                <td className="px-3 py-2 tabular-nums">{row.otLosses}</td>
                <td className="px-3 py-2 font-semibold tabular-nums">{row.points}</td>
                <td className="px-3 py-2 tabular-nums">{row.goalsFor}</td>
                <td className="px-3 py-2 tabular-nums">{row.goalsAgainst}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function HockeyCompetitionHub({
  competition,
  games,
  standings,
  error,
}: {
  competition: HockeyCompetitionConfig;
  games: NhlScheduleGame[];
  standings: NhlStandingRow[];
  error?: string;
}) {
  const upcoming = games.filter((game) => game.status !== "final");
  const results = games.filter((game) => game.status === "final").slice().reverse();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="desk-kicker">Hockey</p>
        <h1 className="font-display text-3xl font-bold">{competition.shortName}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{competition.description}</p>
      </header>
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      <StandingsTable rows={standings} />
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 grid gap-3 md:grid-cols-2">
          {upcoming.length ? (
            upcoming.map((game) => <GameCard key={game.id} game={game} />)
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming games in the current window.</p>
          )}
        </TabsContent>
        <TabsContent value="results" className="mt-4 grid gap-3 md:grid-cols-2">
          {results.length ? (
            results.map((game) => <GameCard key={game.id} game={game} />)
          ) : (
            <p className="text-sm text-muted-foreground">No final scores in this window yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
