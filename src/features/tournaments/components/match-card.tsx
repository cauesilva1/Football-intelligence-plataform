import { MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NationalTeamCrest } from "@/features/tournaments/components/national-team-crest";
import { cn } from "@/lib/utils";
import type { TournamentMatch } from "@/lib/tournaments/types";

function formatDisplayDate(match: TournamentMatch): string {
  if (match.kickOff?.includes("T")) {
    return new Date(match.kickOff).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const [hours, minutes] = (match.kickOff ?? "12:00:00").split(":");
  const parsed = new Date(`${match.date}T${hours}:${minutes}:00`);
  return parsed.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ match }: { match: TournamentMatch }) {
  if (match.status === "live") {
    return (
      <Badge className="animate-pulse border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
        {match.statusLabel}
      </Badge>
    );
  }
  if (match.status === "finished") {
    return <Badge variant="secondary">{match.statusLabel}</Badge>;
  }
  if (match.status === "postponed") {
    return <Badge variant="amber">{match.statusLabel}</Badge>;
  }
  return (
    <Badge variant="outline" className="border-primary/30 text-primary">
      {match.statusLabel}
    </Badge>
  );
}

export function MatchCard({ match }: { match: TournamentMatch }) {
  const hasScore = match.homeScore != null && match.awayScore != null;
  const homeWon = hasScore && match.homeScore! > match.awayScore!;
  const awayWon = hasScore && match.awayScore! > match.homeScore!;

  return (
    <Card className="border-border/60 bg-card/90 transition-all hover:border-primary/40 hover:shadow-panel">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDisplayDate(match)}
          </span>
          <div className="flex items-center gap-2">
            {match.matchWeek != null && match.stageKey === "group" ? (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Rod. {match.matchWeek}
              </span>
            ) : null}
            <StatusBadge match={match} />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <NationalTeamCrest name={match.homeTeam} crestUrl={match.homeCrestUrl} size="sm" />
            <span
              className={cn(
                "truncate font-display text-sm font-semibold",
                homeWon ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {match.homeTeam}
            </span>
          </div>

          <div className="flex min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-xl bg-secondary/70 px-3 py-2 font-display text-xl font-bold tabular-nums">
            {hasScore ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className={homeWon ? "text-primary" : "text-foreground"}>{match.homeScore}</span>
                  <span className="text-sm text-muted-foreground">–</span>
                  <span className={awayWon ? "text-primary" : "text-foreground"}>{match.awayScore}</span>
                </div>
                {match.homeScorePenalties != null && match.awayScorePenalties != null ? (
                  <span className="text-[9px] font-normal text-muted-foreground">
                    ({match.homeScoreRegular ?? "?"}–{match.awayScoreRegular ?? "?"} · pen.{" "}
                    {match.homeScorePenalties}–{match.awayScorePenalties})
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">vs</span>
            )}
          </div>

          <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
            <NationalTeamCrest name={match.awayTeam} crestUrl={match.awayCrestUrl} size="sm" />
            <span
              className={cn(
                "truncate font-display text-sm font-semibold",
                awayWon ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {match.awayTeam}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {match.stadium}
            {match.stadiumCountry ? `, ${match.stadiumCountry}` : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
