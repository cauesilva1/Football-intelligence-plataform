import Link from "next/link";
import { DataPanel } from "@/components/data/data-panel";
import { buttonVariants } from "@/components/ui/button";
import { NbaShotChart } from "@/features/scouting/components/profile/nba-shot-chart";
import { queryNbaShotChart } from "@/features/scouting/queries/nba-shot-chart";
import { cn } from "@/lib/utils";

export async function NbaShotMapSection({
  playerId,
  season,
}: {
  playerId: string;
  season?: string;
}) {
  const model = await queryNbaShotChart(playerId, season);
  const seasons =
    model.seasons.length > 0
      ? model.seasons
      : model.selectedSeason
        ? [{ key: model.selectedSeason, label: model.seasonLabel || model.selectedSeason }]
        : [];

  return (
    <DataPanel
      title="Shot chart"
      description="Full court from ESPN play-by-play. Offense is zoned by FG%; under 5 attempts stay grey. Steals and blocks sit on the defensive half."
      action={
        seasons.length ? (
          <div className="flex flex-wrap items-center gap-2">
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
          No shot chart for {model.seasonLabel || "this season"} yet. Games already in the database are mapped a few at a time by the daily sync.
        </p>
      ) : null}
      <NbaShotChart model={model} />
    </DataPanel>
  );
}
