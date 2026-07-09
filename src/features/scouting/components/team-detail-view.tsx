import { MapPin, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamCrest } from "@/components/teams/team-crest";
import { TeamSquadTable } from "@/features/scouting/components/team-squad-table";
import { StatsBombAttribution } from "@/features/scouting/components/statsbomb-attribution";
import { queryTeamById } from "@/features/scouting/queries/teams";
import { isDbSource } from "@/lib/data-source";
import { getTeamTheme } from "@/lib/team-theme";
import { notFound } from "next/navigation";

export async function TeamDetailView({ teamId }: { teamId: string }) {
  const team = await queryTeamById(teamId);
  if (!team) notFound();

  const sb = team.statsBomb;
  const theme = getTeamTheme(team.competition?.name, team.name);
  const goalBalance = sb?.goalBalance ?? 0;
  const balanceLabel = goalBalance > 0 ? `+${goalBalance}` : String(goalBalance);

  const statCards = [
    { label: "Wins", value: sb?.wins ?? "—", accent: theme.primaryColor },
    { label: "Draws", value: sb?.draws ?? "—", accent: "#94a3b8" },
    { label: "Losses", value: sb?.losses ?? "—", accent: "#f87171" },
    { label: "Goal difference", value: sb ? balanceLabel : "—", accent: goalBalance >= 0 ? theme.secondaryColor : "#f87171" },
  ];

  return (
    <div className="space-y-6">
      <section
        className={`overflow-hidden rounded-2xl border border-border bg-gradient-to-br shadow-panel ${theme.gradientString}`}
        style={{ borderColor: `${theme.primaryColor}44` }}
      >
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <TeamCrest
            name={team.name}
            crestUrl={team.crestUrl}
            competitionName={team.competition?.name}
            apiSportsId={team.apiSportsId}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
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
            {sb ? (
              <p className="text-xs text-white/50">
                {sb.matchesPlayed} matches · {sb.goalsFor} goals scored · {sb.goalsAgainst} conceded ·{" "}
                {sb.statsBombCompetitionName}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border-border/80 bg-card/80">
            <CardContent className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
          <CardTitle className="font-display text-lg">Squad · {(team.squad ?? []).length} players</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <TeamSquadTable
            squad={team.squad ?? []}
            competitionName={team.competition?.name}
            teamName={team.name}
          />
        </CardContent>
      </Card>

      {!isDbSource() ? <StatsBombAttribution /> : null}
    </div>
  );
}
