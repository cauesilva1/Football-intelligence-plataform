import Link from "next/link";
import { ArrowRight, GraduationCap, Shield } from "lucide-react";
import { AMERICAN_FOOTBALL_COMPETITIONS } from "@/lib/tournaments/american-football-competitions";
import { cn } from "@/lib/utils";

const ICONS = {
  nfl: Shield,
  "college-football": GraduationCap,
} as const;

export function AmericanFootballTournamentsIndex() {
  return (
    <div className="space-y-8">
      <div className="sport-hero overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-panel md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Leagues</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
          Competitions
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          NFL (32 franchises, standings by division) and College Football (elite conferences).
          Rosters are available under Franchises — without a mass sync of every program.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          United States
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {AMERICAN_FOOTBALL_COMPETITIONS.map((competition) => {
            const Icon =
              ICONS[competition.slug as keyof typeof ICONS] ?? Shield;
            return (
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
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {competition.badge}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  {competition.shortName}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {competition.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open hub
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
