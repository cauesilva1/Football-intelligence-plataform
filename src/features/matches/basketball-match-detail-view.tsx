import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchScoreboardSurface } from "@/features/matches/components/match-scoreboard-surface";
import { MatchSportExit } from "@/features/matches/components/match-sport-exit";
import type { BasketballMatchDetail } from "@/lib/api/espn-nba-match-detail";
import { cn } from "@/lib/utils";

function StatusBadge({ status, label }: { status: string; label: string }) {
  if (status === "live") {
    return (
      <Badge className="animate-pulse border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
        {label}
      </Badge>
    );
  }
  if (status === "finished") {
    return <Badge variant="secondary">{label}</Badge>;
  }
  return (
    <Badge variant="outline" className="border-primary/30 text-primary">
      {label}
    </Badge>
  );
}

function TeamMark({
  name,
  crestUrl,
  won,
  align = "left",
}: {
  name: string;
  crestUrl?: string;
  won: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row",
        align === "right" && "sm:flex-row-reverse sm:text-right",
        align === "left" && "sm:text-left"
      )}
    >
      {crestUrl ? (
        <Image
          src={crestUrl}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
          unoptimized
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xs font-bold">
          {name.slice(0, 3).toUpperCase()}
        </span>
      )}
      <span
        className={cn(
          "font-display text-lg font-bold md:text-2xl",
          won ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {name}
      </span>
    </div>
  );
}

export function BasketballMatchDetailView({ data }: { data: BasketballMatchDetail }) {
  const hasScore = data.homeScore != null && data.awayScore != null;
  const homeWon = hasScore && data.homeScore! > data.awayScore!;
  const awayWon = hasScore && data.awayScore! > data.homeScore!;

  const homePlayers = data.players.filter((p) => p.teamName === data.homeTeam);
  const awayPlayers = data.players.filter((p) => p.teamName === data.awayTeam);
  const unknown =
    homePlayers.length === 0 && awayPlayers.length === 0 ? data.players : [];

  const homeStats = summarizeTeam(homePlayers);
  const awayStats = summarizeTeam(awayPlayers);

  return (
    <div className="space-y-6">
      <MatchSportExit sport="BASKETBALL" />
      <MatchScoreboardSurface sport="BASKETBALL">
        <Link
          href={data.competition === "ncaa" ? "/tournaments/ncaa" : "/tournaments/nba"}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {data.competition === "ncaa" ? "NCAA" : "NBA"}
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {data.competitionName}
          </span>
          <StatusBadge status={data.status} label={data.statusLabel} />
          <span className="text-[11px] text-muted-foreground">{data.sourceLabel}</span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{data.stageName}</p>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamMark
            name={data.homeTeam}
            crestUrl={data.homeCrestUrl}
            won={homeWon}
            align="left"
          />

          <div className="rounded-2xl border border-primary/20 bg-background/70 px-5 py-3 text-center font-display text-3xl font-bold tabular-nums backdrop-blur-sm md:text-4xl">
            {hasScore ? (
              <span>
                <span className={homeWon ? "text-primary" : ""}>{data.homeScore}</span>
                <span className="mx-2 text-muted-foreground">–</span>
                <span className={awayWon ? "text-primary" : ""}>{data.awayScore}</span>
              </span>
            ) : (
              <span className="text-lg text-muted-foreground">vs</span>
            )}
          </div>

          <TeamMark
            name={data.awayTeam}
            crestUrl={data.awayCrestUrl}
            won={awayWon}
            align="right"
          />
        </div>

        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            {data.stadium}
            {data.stadiumCountry ? ` · ${data.stadiumCountry}` : ""}
          </span>
        </div>
      </MatchScoreboardSurface>

      {data.players.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <TeamStatCard name={data.homeTeam} stats={homeStats} />
          <TeamStatCard name={data.awayTeam} stats={awayStats} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Box score</h2>
        {data.players.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {data.status === "scheduled"
              ? "This game is scheduled — box score will appear after tip-off."
              : "Individual statistics are not available for this game yet."}
          </p>
        ) : (
          <div className="space-y-6">
            {homePlayers.length > 0 ? (
              <PlayerTable title={data.homeTeam} players={homePlayers} />
            ) : null}
            {awayPlayers.length > 0 ? (
              <PlayerTable title={data.awayTeam} players={awayPlayers} />
            ) : null}
            {unknown.length > 0 ? <PlayerTable title="Players" players={unknown} /> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function summarizeTeam(players: BasketballMatchDetail["players"]) {
  if (!players.length) return null;
  return {
    points: players.reduce((s, p) => s + p.points, 0),
    rebounds: players.reduce((s, p) => s + p.rebounds, 0),
    assists: players.reduce((s, p) => s + p.assists, 0),
    steals: players.reduce((s, p) => s + p.steals, 0),
    blocks: players.reduce((s, p) => s + p.blocks, 0),
  };
}

function TeamStatCard({
  name,
  stats,
}: {
  name: string;
  stats: ReturnType<typeof summarizeTeam>;
}) {
  if (!stats) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-4">
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
        {(
          [
            ["PTS", stats.points],
            ["REB", stats.rebounds],
            ["AST", stats.assists],
            ["STL", stats.steals],
            ["BLK", stats.blocks],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="font-mono font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PlayerTable({
  title,
  players,
}: {
  title: string;
  players: BasketballMatchDetail["players"];
}) {
  const sorted = [...players].sort(
    (a, b) => b.points - a.points || b.rebounds - a.rebounds || b.minutesPlayed - a.minutesPlayed
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-2 py-2 text-center font-medium">Min</th>
              <th className="px-2 py-2 text-center font-medium">PTS</th>
              <th className="px-2 py-2 text-center font-medium">REB</th>
              <th className="px-2 py-2 text-center font-medium">AST</th>
              <th className="px-2 py-2 text-center font-medium">STL</th>
              <th className="px-2 py-2 text-center font-medium">BLK</th>
              <th className="px-2 py-2 text-center font-medium">FG</th>
              <th className="px-2 py-2 text-center font-medium">3P</th>
              <th className="px-2 py-2 text-center font-medium">FT</th>
              <th className="px-3 py-2 text-right font-medium">+/-</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => (
              <tr
                key={`${player.espnAthleteId}-${player.fullName}`}
                className="border-t border-border/50"
              >
                <td className="px-3 py-2 font-medium text-foreground">{player.fullName}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.minutesPlayed}</td>
                <td className="px-2 py-2 text-center font-semibold tabular-nums text-primary">
                  {player.points}
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{player.rebounds}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.assists}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.steals}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.blocks}</td>
                <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                  {player.fieldGoals}
                </td>
                <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                  {player.threePointers}
                </td>
                <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                  {player.freeThrows}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {player.plusMinus ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
