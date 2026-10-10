import Link from "next/link";
import { DataPanel } from "@/components/data/data-panel";
import { buttonVariants } from "@/components/ui/button";
import { SoccerShotChart } from "@/features/scouting/components/profile/soccer-shot-chart";
import { querySoccerShotChart } from "@/features/scouting/queries/soccer-shot-chart";
import { cn } from "@/lib/utils";

export async function SoccerShotMapSection({
  playerId,
  season,
}: {
  playerId: string;
  season?: string;
}) {
  const model = await querySoccerShotChart(playerId, season);
  const seasons =
    model.seasons.length > 0
      ? model.seasons
      : model.selectedSeason
        ? [{ key: model.selectedSeason, label: model.seasonLabel || model.selectedSeason }]
        : [];

  return (
    <DataPanel
      title="Effectiveness map"
      description="Attacking half from ESPN play coordinates. Zones are colored by on-target rate; under 5 attempts stay grey."
      action={
        seasons.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {model.attempts > 0 ? (
              <Link
                href={`/compare/maps?playerA=${playerId}&season=${encodeURIComponent(model.selectedSeason)}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 px-3 text-xs")}
              >
                Compare
              </Link>
            ) : null}
            <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Season</span>
            {seasons.map((item) => (
              <Link
                key={item.key}
                href={`/players/${playerId}?tab=mapa&season=${encodeURIComponent(item.key)}`}
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
      {model.attempts === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          No effectiveness map for {model.seasonLabel || "this season"} yet. Games already in the database are mapped a few at a time by the daily sync.
        </p>
      ) : null}
      <SoccerShotChart
        model={model}
        coverage={`Map reflects ${model.trackedGames} tracked ${model.trackedGames === 1 ? "game" : "games"}; profile totals cover the full season.`}
      />
    </DataPanel>
  );
}
