import Link from "next/link";
import { DataPanel } from "@/components/data/data-panel";
import { buttonVariants } from "@/components/ui/button";
import { HockeyShotChart } from "@/features/scouting/components/profile/hockey-shot-chart";
import { queryHockeyShotChart } from "@/features/scouting/queries/hockey-shot-chart";
import { parseHockeyRinkView, type HockeyRinkView } from "@/lib/hockey/rink-geometry";
import { cn } from "@/lib/utils";

const RINK_VIEWS: Array<{ id: HockeyRinkView; label: string }> = [
  { id: "offense", label: "Offense" },
  { id: "full", label: "Full" },
];

function mapHref(playerId: string, season: string | undefined, view: HockeyRinkView) {
  const params = new URLSearchParams();
  params.set("tab", "maps");
  if (season) params.set("season", season);
  if (view !== "offense") params.set("court", view);
  return `/players/${playerId}?${params.toString()}`;
}

export async function HockeyShotMapSection({
  playerId,
  season,
  court,
}: {
  playerId: string;
  season?: string;
  court?: string;
}) {
  const view = parseHockeyRinkView(court);
  const model = await queryHockeyShotChart(playerId, season);
  const seasonKey = season ?? model.selectedSeason;
  const seasons =
    model.seasons.length > 0
      ? model.seasons
      : model.selectedSeason
        ? [{ key: model.selectedSeason, label: model.seasonLabel || model.selectedSeason }]
        : [];

  return (
    <DataPanel
      title="Shot chart"
      description={
        view === "full"
          ? "Full rink from NHL play-by-play. Shots are folded onto the attacking net so a period change cannot flip the goal. Under 5 shots stay grey."
          : "Attacking half from NHL play-by-play. Shots are folded onto one net. Under 5 shots stay grey."
      }
      action={
        seasons.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Season</span>
            {seasons.map((item) => (
              <Link
                key={item.key}
                href={mapHref(playerId, item.key, view)}
                className={cn(
                  buttonVariants({
                    variant: item.key === model.selectedSeason ? "default" : "outline",
                    size: "sm",
                  }),
                  "h-7 px-3 text-xs"
                )}
                aria-current={item.key === model.selectedSeason ? "true" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null
      }
    >
      <nav
        aria-label="Rink view"
        className="mb-4 inline-flex gap-1 rounded-xl border border-border bg-surface-muted p-1"
      >
        {RINK_VIEWS.map((item) => {
          const selected = view === item.id;
          return (
            <Link
              key={item.id}
              href={mapHref(playerId, seasonKey || undefined, item.id)}
              aria-current={selected ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: selected ? "default" : "ghost", size: "sm" }),
                "h-8 px-3 text-xs uppercase tracking-wide"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <HockeyShotChart model={model} view={view} />
    </DataPanel>
  );
}
