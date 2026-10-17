import Link from "next/link";
import { DataPanel } from "@/components/data/data-panel";
import { buttonVariants } from "@/components/ui/button";
import { NbaShotChart } from "@/features/scouting/components/profile/nba-shot-chart";
import { queryNbaShotChart } from "@/features/scouting/queries/nba-shot-chart";
import { parseNbaCourtView, type NbaCourtView } from "@/lib/basketball/court-geometry";
import { cn } from "@/lib/utils";

const COURT_VIEWS: Array<{ id: NbaCourtView; label: string }> = [
  { id: "offense", label: "Offense" },
  { id: "defense", label: "Defense" },
  { id: "full", label: "Full" },
];

function mapHref(playerId: string, season: string | undefined, court: NbaCourtView) {
  const params = new URLSearchParams();
  params.set("tab", "maps");
  if (season) params.set("season", season);
  if (court !== "offense") params.set("court", court);
  return `/players/${playerId}?${params.toString()}`;
}

export async function NbaShotMapSection({
  playerId,
  season,
  court,
}: {
  playerId: string;
  season?: string;
  court?: string;
}) {
  const view = parseNbaCourtView(court);
  const model = await queryNbaShotChart(playerId, season);
  const seasonKey = season ?? model.selectedSeason;
  const seasons =
    model.seasons.length > 0
      ? model.seasons
      : model.selectedSeason
        ? [{ key: model.selectedSeason, label: model.seasonLabel || model.selectedSeason }]
        : [];

  const description =
    view === "defense"
      ? "Half court from ESPN play-by-play. Steals and blocks are markers only."
      : view === "full"
        ? "Full court from ESPN play-by-play. Offense is zoned by FG%; under 5 attempts stay grey. Steals and blocks sit on the defensive half."
        : "Half court from ESPN play-by-play. Zones follow FG%; under 5 attempts stay grey.";

  return (
    <DataPanel
      title="Shot chart"
      description={description}
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
        aria-label="Court view"
        className="mb-4 inline-flex gap-1 rounded-xl border border-border bg-surface-muted p-1"
      >
        {COURT_VIEWS.map((item) => {
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
      {view !== "defense" && model.attempts === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          No shot chart for {model.seasonLabel || "this season"} yet. Games already in the database are mapped a few at a time by the daily sync.
        </p>
      ) : null}
      <NbaShotChart model={model} view={view} />
    </DataPanel>
  );
}
