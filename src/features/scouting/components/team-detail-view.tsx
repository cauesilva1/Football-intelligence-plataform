import { MapPin, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamCrest } from "@/components/teams/team-crest";
import { TeamSquadTable } from "@/features/scouting/components/team-squad-table";
import { StatsBombAttribution } from "@/features/scouting/components/statsbomb-attribution";
import { BrasileiraoSeasonNotice } from "@/features/scouting/components/brasileirao-season-notice";
import { TeamBackLink } from "@/features/scouting/components/team-back-link";
import { queryTeamById } from "@/features/scouting/queries/teams";
import { isDbSource } from "@/lib/data-source";
import { isBrazilianLeague } from "@/lib/seasons";
import {
  isBasketballTeamCompetition,
  resolveBasketballLeagueFromCompetition,
} from "@/lib/basketball/team-league";
import { isAmericanFootballTeamCompetition } from "@/lib/american-football/team-league";
import { getTeamTheme } from "@/lib/team-theme";
import { notFound } from "next/navigation";

function buildStatCards(
  isBasketball: boolean,
  isAmericanFootball: boolean,
  teamStats: { wins: number; draws: number; losses: number } | undefined,
  sb: { wins: number; draws: number; losses: number; goalBalance: number } | undefined,
  theme: ReturnType<typeof getTeamTheme>,
  squadSize: number
) {
  if (isBasketball || isAmericanFootball) {
    const wins = sb?.wins ?? teamStats?.wins ?? 0;
    const losses = sb?.losses ?? teamStats?.losses ?? 0;
    const games = wins + losses;
    const winPct = games > 0 ? `${((wins / games) * 100).toFixed(1)}%` : "—";

    return [
      { label: "Wins", value: games > 0 ? wins : "—", accent: theme.primaryColor },
      { label: "Losses", value: games > 0 ? losses : "—", accent: "#f87171" },
      { label: "Win %", value: winPct, accent: theme.secondaryColor },
      { label: "Roster", value: squadSize, accent: theme.primaryColor },
    ];
  }

  const goalBalance = sb?.goalBalance ?? 0;
  const balanceLabel = goalBalance > 0 ? `+${goalBalance}` : String(goalBalance);

  return [
    { label: "Wins", value: sb?.wins ?? "—", accent: theme.primaryColor },
    { label: "Draws", value: sb?.draws ?? "—", accent: "#94a3b8" },
    { label: "Losses", value: sb?.losses ?? "—", accent: "#f87171" },
    { label: "Goal difference", value: sb ? balanceLabel : "—", accent: goalBalance >= 0 ? theme.secondaryColor : "#f87171" },
  ];
}

export async function TeamDetailView({ teamId }: { teamId: string }) {
  const team = await queryTeamById(teamId);
  if (!team) notFound();

  const sb = team.statsBomb;
  const theme = getTeamTheme(team.competition?.name, team.name);
  const isBrasileirao = isBrazilianLeague(team.competition?.name);
  const isBasketball = isBasketballTeamCompetition(team.competition?.name);
  const isAmericanFootball = isAmericanFootballTeamCompetition(team.competition?.name);
  const basketballLeague = resolveBasketballLeagueFromCompetition(team.competition?.name);
  const squad = team.squad ?? [];
  const statCards = buildStatCards(
    isBasketball,
    isAmericanFootball,
    team.stats,
    sb,
    theme,
    squad.length
  );

  return (
    <div className="space-y-6">
      <TeamBackLink competitionName={team.competition?.name} />

      {isBrasileirao ? <BrasileiraoSeasonNotice /> : null}

      <section
        className={`overflow-hidden rounded-2xl border border-border bg-gradient-to-br shadow-panel ${theme.gradientString}`}
        style={{ borderColor: `${theme.primaryColor}44` }}
      >
        <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-center md:p-6">
          <TeamCrest
            name={team.name}
            crestUrl={team.crestUrl}
            competitionName={team.competition?.name}
            apiSportsId={team.apiSportsId}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-white md:text-3xl">
                {team.name}
              </h1>
              <Badge variant="secondary">{team.shortName}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
              {team.competition?.name ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-white/90">
                  <Trophy className="h-4 w-4" style={{ color: theme.secondaryColor }} />
                  {team.competition.name}
                  {sb ? ` · ${sb.seasonLabel}` : ""}
                </span>
              ) : null}
              {team.stadium ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {team.stadium}
                </span>
              ) : null}
            </div>
            {isBasketball || isAmericanFootball ? (
              <p className="text-xs text-white/50">
                {squad.length} players on the roster
                {sb
                  ? ` · ${sb.wins}V–${sb.losses}D · ${sb.seasonLabel} (${sb.statsBombCompetitionName})`
                  : ""}
              </p>
            ) : sb ? (
              <p className="text-xs text-white/50">
                {sb.matchesPlayed} matches · {sb.goalsFor} goals scored · {sb.goalsAgainst} conceded ·{" "}
                {sb.statsBombCompetitionName}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border-border/80 bg-card/80">
            <CardContent className="p-5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p
                className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground"
                style={{ color: card.accent !== "#94a3b8" ? card.accent : undefined }}
              >
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="font-display text-lg">
            {isBasketball || isAmericanFootball ? "Roster" : "Squad"} · {squad.length}{" "}
            {isBasketball || isAmericanFootball ? "players" : "players"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {squad.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {basketballLeague === "NCAA"
                ? "College roster has not been synced for this program yet."
                : isAmericanFootball
                  ? "Roster is still empty — ESPN on-demand sync runs when this page opens."
                  : isBasketball
                    ? "No players are linked to this franchise at the moment."
                    : "Roster is still empty — reload the page to sync through ESPN."}
            </p>
          ) : (
            <TeamSquadTable
              squad={squad}
              competitionName={team.competition?.name}
              teamName={team.name}
              sport={
                isBasketball
                  ? "BASKETBALL"
                  : isAmericanFootball
                    ? "AMERICAN_FOOTBALL"
                    : "SOCCER"
              }
            />
          )}
        </CardContent>
      </Card>

      {!isDbSource() && !isBasketball && !isAmericanFootball ? <StatsBombAttribution /> : null}
    </div>
  );
}
