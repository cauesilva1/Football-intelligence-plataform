import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { sportTheme } from "@/lib/sport-theme";
import type { Sport } from "@/lib/sport";
import { appConfig } from "@/lib/config";
import { CURRENT_SEASON, NEXT_EUROPEAN_SEASON, BRAZIL_SEASON_LABEL, EUROPEAN_NEXT_SEASON_LIVE } from "@/lib/seasons";
import { cn } from "@/lib/utils";

const COPY: Record<Sport, { title: string; lede: string }> = {
  SOCCER: {
    title: "Scouting",
    lede: "Filter by role, league, and productive-season floors — then open a profile you can defend in the room.",
  },
  BASKETBALL: {
    title: "Basketball scouting",
    lede: "Secondary desk — thinner coverage than soccer. Filter by metrics, then open a profile with season evidence.",
  },
  AMERICAN_FOOTBALL: {
    title: "American football scouting",
    lede: "Secondary desk — NFL/CFB coverage is partial. Filter by position; production on the profile, not a vanity overall.",
  },
};

/** Light editorial page head — Analyst cadence, not a dashboard hero. */
export function ScoutingDeskMasthead({
  sport,
  className,
}: {
  sport: Sport;
  className?: string;
}) {
  const copy = COPY[sport] ?? COPY.SOCCER;
  const theme = sportTheme(sport);
  const seasonMeta =
    sport === "SOCCER"
      ? EUROPEAN_NEXT_SEASON_LIVE
        ? `Season ${NEXT_EUROPEAN_SEASON} · BR ${BRAZIL_SEASON_LABEL}`
        : `Showcase ${CURRENT_SEASON} · BR ${BRAZIL_SEASON_LABEL}`
      : `Season ${appConfig.season}`;

  return (
    <header className={cn("editorial-pagehead", className)}>
      <div className="editorial-pagehead-row">
        <div>
          <p className="desk-kicker">
            {theme.label}
            {sport !== "SOCCER" ? " · secondary" : ""}
          </p>
          <h1 className="editorial-pagehead-title">{copy.title}</h1>
          <p className="editorial-pagehead-lede">{copy.lede}</p>
        </div>
        <p className="editorial-pagehead-meta">{seasonMeta}</p>
      </div>
      <ScoutWorkflowNav current="discover" />
    </header>
  );
}
