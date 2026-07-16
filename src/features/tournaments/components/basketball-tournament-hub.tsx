import Link from "next/link";
import { CircleDot, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BasketballGamesHub } from "@/features/tournaments/components/basketball-games-hub";
import { fetchNbaScheduleBundle, type NbaScheduleBundle } from "@/lib/api/espn-nba-schedule";

const BASKETBALL_TOURNAMENTS = [
  {
    id: "nba",
    name: "NBA",
    subtitle: "National Basketball Association",
    description: "30 franquias · elencos, cap hit e histórico de temporada.",
    href: "/teams?league=nba",
    icon: CircleDot,
    badge: "Pro League",
  },
  {
    id: "ncaa",
    name: "NCAA",
    subtitle: "College Basketball",
    description: "Programas universitários · prospects e scouting para o draft.",
    href: "/teams?league=ncaa",
    icon: GraduationCap,
    badge: "College",
  },
] as const;

export async function BasketballTournamentHub() {
  let schedule: NbaScheduleBundle = {
    live: [],
    past: [],
    scheduled: [],
    fetchedAt: new Date().toISOString(),
  };

  try {
    schedule = await fetchNbaScheduleBundle();
  } catch (error) {
    console.warn("[basketball-tournament-hub] Falha ao carregar agenda NBA:", error);
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-950 via-slate-950 to-black p-4 shadow-panel md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Basketball Hub</p>
        <h1 className="mt-1.5 font-display text-xl font-bold text-foreground md:mt-2 md:text-3xl">
          Competições de Basquete
        </h1>
        <p className="mt-1.5 hidden max-w-2xl text-sm text-muted-foreground sm:mt-2 sm:block">
          Explore as principais ligas. Acompanhe jogos em tempo real, resultados históricos e
          estatísticas de franquias e universidades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {BASKETBALL_TOURNAMENTS.map((tournament) => {
          const Icon = tournament.icon;
          return (
            <Link key={tournament.id} href={tournament.href}>
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary">{tournament.badge}</Badge>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">{tournament.name}</h2>
                  <p className="mt-1 text-sm font-medium text-primary/90">{tournament.subtitle}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{tournament.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <BasketballGamesHub schedule={schedule} />
    </div>
  );
}
