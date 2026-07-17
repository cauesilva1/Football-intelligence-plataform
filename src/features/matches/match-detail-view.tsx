import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NationalTeamCrest } from "@/features/tournaments/components/national-team-crest";
import type { MatchDetailPayload } from "@/features/matches/match-queries";
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

export function MatchDetailView({ data }: { data: MatchDetailPayload }) {
  const { match, competitionName, boxScores, sourceLabel } = data;
  const hasScore = match.homeScore != null && match.awayScore != null;
  const homeWon = hasScore && match.homeScore! > match.awayScore!;
  const awayWon = hasScore && match.awayScore! > match.homeScore!;

  const homePlayers = boxScores.filter((p) => p.teamName === match.homeTeam);
  const awayPlayers = boxScores.filter((p) => p.teamName === match.awayTeam);
  const unknownTeamPlayers =
    homePlayers.length === 0 && awayPlayers.length === 0 ? boxScores : [];

  const homeTeamStats = summarizeTeam(homePlayers.length ? homePlayers : []);
  const awayTeamStats = summarizeTeam(awayPlayers.length ? awayPlayers : []);

  return (
    <div className="space-y-6">
      <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-panel md:p-8">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Torneios
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {competitionName ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {competitionName}
            </span>
          ) : null}
          <StatusBadge status={match.status} label={match.statusLabel} />
          <span className="text-[11px] text-muted-foreground">{sourceLabel}</span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{match.stageName}</p>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <NationalTeamCrest name={match.homeTeam} crestUrl={match.homeCrestUrl} size="lg" />
            <span
              className={cn(
                "font-display text-lg font-bold md:text-2xl",
                homeWon ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {match.homeTeam}
            </span>
          </div>

          <div className="rounded-2xl bg-secondary/70 px-5 py-3 text-center font-display text-3xl font-bold tabular-nums md:text-4xl">
            {hasScore ? (
              <span>
                <span className={homeWon ? "text-primary" : ""}>{match.homeScore}</span>
                <span className="mx-2 text-muted-foreground">–</span>
                <span className={awayWon ? "text-primary" : ""}>{match.awayScore}</span>
              </span>
            ) : (
              <span className="text-lg text-muted-foreground">vs</span>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
            <NationalTeamCrest name={match.awayTeam} crestUrl={match.awayCrestUrl} size="lg" />
            <span
              className={cn(
                "font-display text-lg font-bold md:text-2xl",
                awayWon ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {match.awayTeam}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            {match.stadium}
            {match.stadiumCountry ? `, ${match.stadiumCountry}` : ""}
          </span>
        </div>
      </div>

      {(homeTeamStats || awayTeamStats) && boxScores.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <TeamStatCard name={match.homeTeam} stats={homeTeamStats} />
          <TeamStatCard name={match.awayTeam} stats={awayTeamStats} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Jogadores</h2>
        {boxScores.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Estatísticas individuais ainda não disponíveis para esta partida.
          </p>
        ) : (
          <div className="space-y-6">
            {homePlayers.length > 0 ? (
              <PlayerTable title={match.homeTeam} players={homePlayers} />
            ) : null}
            {awayPlayers.length > 0 ? (
              <PlayerTable title={match.awayTeam} players={awayPlayers} />
            ) : null}
            {unknownTeamPlayers.length > 0 ? (
              <PlayerTable title="Elenco" players={unknownTeamPlayers} />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function summarizeTeam(players: MatchDetailPayload["boxScores"]) {
  if (!players.length) return null;
  return {
    goals: players.reduce((s, p) => s + p.goals, 0),
    assists: players.reduce((s, p) => s + p.assists, 0),
    tackles: players.reduce((s, p) => s + p.tackles, 0),
    passesCompleted: players.reduce((s, p) => s + p.passesCompleted, 0),
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
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[11px] text-muted-foreground">Gols</dt>
          <dd className="font-mono font-semibold tabular-nums">{stats.goals}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Assistências</dt>
          <dd className="font-mono font-semibold tabular-nums">{stats.assists}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Desarmes</dt>
          <dd className="font-mono font-semibold tabular-nums">{stats.tackles}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Passes certos</dt>
          <dd className="font-mono font-semibold tabular-nums">{stats.passesCompleted}</dd>
        </div>
      </dl>
    </div>
  );
}

function PlayerTable({
  title,
  players,
}: {
  title: string;
  players: MatchDetailPayload["boxScores"];
}) {
  const sorted = [...players].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists || b.minutesPlayed - a.minutesPlayed
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Jogador</th>
              <th className="px-2 py-2 text-center font-medium">Min</th>
              <th className="px-2 py-2 text-center font-medium">G</th>
              <th className="px-2 py-2 text-center font-medium">A</th>
              <th className="px-2 py-2 text-center font-medium">Tkl</th>
              <th className="px-2 py-2 text-center font-medium">Int</th>
              <th className="px-3 py-2 text-right font-medium">Passes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => (
              <tr key={`${player.espnAthleteId}-${player.fullName}`} className="border-t border-border/50">
                <td className="px-3 py-2 font-medium text-foreground">{player.fullName}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.minutesPlayed}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.goals}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.assists}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.tackles}</td>
                <td className="px-2 py-2 text-center tabular-nums">{player.interceptions}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {player.passesCompleted}/{player.passesAttempted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
