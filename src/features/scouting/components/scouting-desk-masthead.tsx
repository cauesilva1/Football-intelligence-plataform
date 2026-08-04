import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { sportTheme } from "@/lib/sport-theme";
import type { Sport } from "@/lib/sport";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

const COPY: Record<Sport, { title: string; lede: string }> = {
  SOCCER: {
    title: "Scouting",
    lede: "Filter by role, league, and productive-season floors — then open a profile you can defend in the room.",
  },
  BASKETBALL: {
    title: "Basketball scouting",
    lede: "Filter by metrics and archetypes — then open a profile with season evidence on the table.",
  },
  AMERICAN_FOOTBALL: {
    title: "American football scouting",
    lede: "Filter NFL and college by position — production lands on the profile, not as a vanity overall.",
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

  return (
    <header className={cn("editorial-pagehead", className)}>
      <div className="editorial-pagehead-row">
        <div>
          <p className="desk-kicker">{theme.label}</p>
          <h1 className="editorial-pagehead-title">{copy.title}</h1>
          <p className="editorial-pagehead-lede">{copy.lede}</p>
        </div>
        <p className="editorial-pagehead-meta">Season {appConfig.season}</p>
      </div>
      <ScoutWorkflowNav current="discover" />
    </header>
  );
}
