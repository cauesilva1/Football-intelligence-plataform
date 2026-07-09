import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlayerSeasonSelector({
  playerId,
  availableSeasons,
  selectedSeason,
}: {
  playerId: string;
  availableSeasons: string[];
  selectedSeason: string;
}) {
  if (availableSeasons.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Season</span>
      {availableSeasons.map((season) => (
        <Link
          key={season}
          href={`/players/${playerId}?season=${encodeURIComponent(season)}`}
          className={cn(
            buttonVariants({
              variant: selectedSeason === season ? "default" : "outline",
              size: "sm",
            }),
            "h-7 px-3 text-xs"
          )}
        >
          {season}
        </Link>
      ))}
    </div>
  );
}
