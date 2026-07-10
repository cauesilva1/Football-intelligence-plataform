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
  sport = "SOCCER",
}: {
  competitionId?: string;
  sport?: Sport;
}) {
  const teams: TeamWithStatsBomb[] = await queryTeams(competitionId);
  const isBasketball = sport === "BASKETBALL";

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {teams.length} {isBasketball ? "franquias" : "clubs"}
        {!isBasketball && (
          <>
            {" · "}
            {isDbSource()
              ? `Supabase + ESPN live (${teams[0]?.statsBomb?.seasonLabel ?? CURRENT_SEASON})`
              : `StatsBomb, ESPN, or local data (${teams[0]?.statsBomb?.seasonLabel ?? CURRENT_SEASON})`}
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
                    {!isBasketball && team.stadium ? ` · ${team.stadium}` : ""}
                    {!isBasketball && sb ? ` · ${sb.seasonLabel}` : ""}
                  </p>

                  {isBasketball ? (
                    <div className="mt-4 rounded-lg border border-border bg-surface-muted/30 px-3 py-3 text-center">
                      <p className="font-display text-lg font-bold text-primary">{team.squadSize ?? 0}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Jogadores no elenco
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="font-display text-sm font-bold text-primary">{sb?.wins ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Wins</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{sb?.draws ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Draws</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{sb?.losses ?? "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Losses</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{sb ? balanceLabel : "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">GD</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {team.squadSize ?? 0} players
                    </span>
                    {!isBasketball && sb ? <span className="text-primary/80">{sb.seasonLabel}</span> : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {teams.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {isBasketball ? "Nenhuma franquia encontrada para este filtro." : "No clubs found for this filter."}
        </p>
      ) : null}
      {!isDbSource() && !isBasketball ? <StatsBombAttribution /> : null}
    </div>
  );
}
