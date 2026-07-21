import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import {
  REGION_LABELS,
  SOCCER_COMPETITIONS,
  type SoccerCompetitionRegion,
} from "@/lib/tournaments/soccer-competitions";
import { cn } from "@/lib/utils";

const REGION_ORDER: SoccerCompetitionRegion[] = ["brazil", "americas", "europe", "international"];

export function SoccerTournamentsIndex() {
  return (
    <div className="space-y-8">
      <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-panel md:p-8">
        <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary">Tournaments</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
          Competitions
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Big Five, Brasileirão, MLS, Champions, and national teams — standings, scoring leaders,
          passes, cards, and games.
        </p>
      </div>

      {REGION_ORDER.map((region) => {
        const items = SOCCER_COMPETITIONS.filter((c) => c.region === region);
        if (!items.length) return null;

        return (
          <section key={region} className="space-y-4">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {REGION_LABELS[region]}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((competition) => (
                <Link
                  key={competition.slug}
                  href={`/tournaments/${competition.slug}`}
                  className={cn(
                    "group flex flex-col rounded-2xl border border-border/70 bg-card/80 p-5 transition-all",
                    "hover:border-primary/40 hover:shadow-panel"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {competition.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                    {competition.shortName}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{competition.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open hub
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
