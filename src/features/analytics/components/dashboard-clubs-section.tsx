import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamCrest } from "@/components/teams/team-crest";
import { DataPanel } from "@/components/data/data-panel";
import {
  queryCompetitionIdForLeague,
  queryTeams,
} from "@/features/scouting/queries/teams";
import { getServerSport } from "@/lib/sport-server";

export async function DashboardClubsSection() {
  const sport = await getServerSport();
  if (sport !== "BASKETBALL") return null;

  let nbaTeams: Awaited<ReturnType<typeof queryTeams>> = [];
  try {
    const nbaCompetitionId = await queryCompetitionIdForLeague("nba");
    nbaTeams = await queryTeams(nbaCompetitionId);
    nbaTeams = [...nbaTeams].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("[dashboard] Franquias NBA indisponíveis:", error);
    return null;
  }

  if (!nbaTeams.length) return null;

  return (
    <DataPanel
      title="Franquias NBA"
      description={`${nbaTeams.length} times cadastrados · elencos ativos`}
      density="dense"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {nbaTeams.slice(0, 10).map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <TeamCrest
                    name={team.name}
                    crestUrl={team.crestUrl}
                    competitionName={team.competition?.name}
                    apiSportsId={team.apiSportsId}
                    size="md"
                  />
                  <Badge variant="secondary">{team.shortName}</Badge>
                </div>
                <p className="truncate font-display text-sm font-bold text-foreground">{team.name}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {team.squadSize ?? 0} jogadores
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {nbaTeams.length > 10 ? (
        <div className="mt-4 text-center">
          <Link href="/teams?league=nba" className="text-sm font-medium text-primary hover:underline">
            Ver todas as {nbaTeams.length} franquias →
          </Link>
        </div>
      ) : null}
    </DataPanel>
  );
}
