import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamCrest } from "@/components/teams/team-crest";
import { StatsBombAttribution } from "@/features/scouting/components/statsbomb-attribution";
import { queryTeams, type TeamWithStatsBomb } from "@/features/scouting/queries/teams";
import { isDbSource } from "@/lib/data-source";
import { CURRENT_SEASON } from "@/lib/seasons";
import type { Sport } from "@/lib/sport";

export async function TeamsGrid({
  competitionId,
  leagueKey,
  sport = "SOCCER",
}: {
  competitionId?: string;
  leagueKey?: string;
  sport?: Sport;
}) {
  const teams: TeamWithStatsBomb[] = await queryTeams(competitionId, leagueKey, {
    enrich: false,
  });
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";
  const isFranchiseSport = isBasketball || isAmericanFootball;
  const entityPlural = isFranchiseSport ? "franchises / programs" : "clubs";

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {teams.length} {entityPlural}
        {!isFranchiseSport && (
          <>
            {" · "}
            {isDbSource()
              ? `Cached data (${teams[0]?.stats?.season ?? CURRENT_SEASON})`
              : `Demo (${teams[0]?.statsBomb?.seasonLabel ?? CURRENT_SEASON})`}
          </>
        )}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {teams.map((team) => {
          const sb = team.statsBomb;
          const goalBalance = sb ? sb.goalBalance : 0;
          const balanceLabel = goalBalance > 0 ? `+${goalBalance}` : String(goalBalance);

          return (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <TeamCrest
                      name={team.name}
                      crestUrl={team.crestUrl}
                      competitionName={team.competition?.name}
                      apiSportsId={team.apiSportsId}
                      size="md"
                    />
                    <Badge variant="secondary">{team.competition?.name ?? team.shortName}</Badge>
                  </div>
                  <p className="font-display text-base font-bold text-foreground">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.country}
                    {!isFranchiseSport && team.stadium ? ` · ${team.stadium}` : ""}
                    {!isFranchiseSport && sb ? ` · ${sb.seasonLabel}` : ""}
                  </p>

                  {isFranchiseSport ? (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-display text-sm font-bold text-primary">{team.stats?.wins ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Wins</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{team.stats?.losses ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Losses</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{team.squadSize ?? 0}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Roster</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="font-display text-sm font-bold text-primary">{sb?.wins ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">V</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{sb?.draws ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">E</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{sb?.losses ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">D</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{sb ? balanceLabel : "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">SG</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {team.squadSize ?? 0} players
                    </span>
                    {!isFranchiseSport && sb ? <span className="text-primary/80">{sb.seasonLabel}</span> : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {teams.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {isFranchiseSport
            ? "No franchises or programs found for this filter."
            : "No clubs found for this filter. Check Tournaments for live league standings."}
        </p>
      ) : null}
      {!isDbSource() && !isFranchiseSport ? <StatsBombAttribution /> : null}
    </div>
  );
}
