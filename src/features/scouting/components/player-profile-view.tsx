import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoutNotesPanel } from "@/features/scout-notes/components/scout-notes-panel";
import { queryPlayerById } from "@/features/scouting/queries/players";
import { PlayerProfileHeader } from "@/features/scouting/components/profile/player-profile-header";
import { PlayerPerformanceSection } from "@/features/scouting/components/profile/player-performance-section";
import { PlayerAnalysisSection } from "@/features/scouting/components/profile/player-analysis-section";
import { PlayerSimilarSection } from "@/features/scouting/components/profile/player-similar-section";
import { PlayerIntelligencePanel } from "@/features/scouting/components/profile/player-intelligence-panel";
import { PlayerTacticalFitPanel } from "@/features/scouting/components/profile/player-tactical-fit-panel";
import { PlayerCompetitionContext } from "@/features/scouting/components/profile/player-competition-context";
import { ProfileBackButton } from "@/features/scouting/components/profile/profile-back-button";
import { NbaShotMapSection } from "@/features/scouting/components/profile/nba-shot-map-section";
import { ScoutMetricsSection } from "@/features/scouting/components/profile/scout-metrics-section";
import { SoccerShotMapSection } from "@/features/scouting/components/profile/soccer-shot-map-section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AfProfileSeasonEnricher } from "@/features/scouting/components/profile/af-profile-season-enricher";
import { resolveFootballHubSeasonYears } from "@/lib/api/espn-football-seasons";
import { supportsIntelligence } from "@/lib/intelligence/registry";
import type { Sport } from "@/lib/sport";
import type { Player } from "@/types";
import { notFound } from "next/navigation";

function SimilarSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

function IntelligenceSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

function playerNeedsAfSeasonEnrich(player: Player): boolean {
  if (player.sport !== "AMERICAN_FOOTBALL") return false;
  const { pastYear, currentYear } = resolveFootballHubSeasonYears();
  const pastKey = String(pastYear);
  const currentKey = String(currentYear);
  const past = player.history.find((row) => row.season === pastKey);
  const hasCurrentStub = player.availableSeasons.includes(currentKey);
  const pastHasSignal =
    !!past &&
    ((past.points ?? 0) > 0 ||
      past.goals > 0 ||
      (past.sacks ?? 0) > 0 ||
      (past.steals ?? 0) > 0 ||
      (past.totalYards ?? 0) > 0 ||
      (past.touchdowns ?? 0) > 0 ||
      (past.passingYards ?? 0) > 0 ||
      (past.rushingYards ?? 0) > 0 ||
      (past.receivingYards ?? 0) > 0);
  return !hasCurrentStub || !past || !pastHasSignal;
}

function profileSectionHref(
  playerId: string,
  season: string | undefined,
  tab: "profile" | "mapa" | "scout"
) {
  const params = new URLSearchParams();
  if (tab !== "profile") params.set("tab", tab);
  if (season) params.set("season", season);
  const query = params.toString();
  return query ? `/players/${playerId}?${query}` : `/players/${playerId}`;
}

export async function PlayerProfileView({
  playerId,
  season,
  tab,
}: {
  playerId: string;
  season?: string;
  tab?: string;
}) {
  const player = await queryPlayerById(playerId, season);
  if (!player) notFound();

  const sport = (player.sport ?? "SOCCER") as Sport;
  const showIntelligence = supportsIntelligence(sport);
  const showTacticalFit = supportsIntelligence(sport);
  const showNbaMap = player.league?.toUpperCase() === "NBA";
  const showSoccerMap = sport === "SOCCER";
  const showShotMap = showNbaMap || showSoccerMap;
  const mapTab = showShotMap && tab === "mapa";
  const scoutTab = showSoccerMap && tab === "scout";
  const seasonKey = season ?? player.selectedSeason;

  return (
    <div className="space-y-6">
      <ProfileBackButton />
      <AfProfileSeasonEnricher
        playerId={playerId}
        enabled={playerNeedsAfSeasonEnrich(player)}
      />
      <PlayerProfileHeader player={player} />
      {showShotMap ? (
        <nav
          aria-label="Player profile sections"
          className="inline-flex gap-1 rounded-xl border border-border bg-surface-muted p-1"
        >
          <Link
            href={profileSectionHref(playerId, seasonKey, "profile")}
            aria-current={!mapTab && !scoutTab ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: !mapTab && !scoutTab ? "default" : "ghost", size: "sm" }),
              "h-8 px-3 text-xs"
            )}
          >
            Profile
          </Link>
          <Link
            href={profileSectionHref(playerId, seasonKey, "mapa")}
            aria-current={mapTab ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: mapTab ? "default" : "ghost", size: "sm" }),
              "h-8 px-3 text-xs"
            )}
          >
            Mapa
          </Link>
          {showSoccerMap ? (
            <Link
              href={profileSectionHref(playerId, seasonKey, "scout")}
              aria-current={scoutTab ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: scoutTab ? "default" : "ghost", size: "sm" }),
                "h-8 px-3 text-xs"
              )}
            >
              Scout
            </Link>
          ) : null}
        </nav>
      ) : null}
      {scoutTab ? (
        <ScoutMetricsSection
          playerId={playerId}
          competitionName={player.competitionName ?? player.league}
          season={seasonKey}
        />
      ) : mapTab ? (
        showSoccerMap ? (
          <SoccerShotMapSection playerId={playerId} season={seasonKey} />
        ) : (
          <NbaShotMapSection playerId={playerId} season={seasonKey} />
        )
      ) : (
        <>
      <PlayerPerformanceSection player={player} />
      {showIntelligence ? (
        <Suspense fallback={<IntelligenceSkeleton />}>
          <PlayerIntelligencePanel playerId={playerId} />
        </Suspense>
      ) : null}
      {showTacticalFit ? (
        <Suspense fallback={<IntelligenceSkeleton />}>
          <PlayerTacticalFitPanel playerId={playerId} teamId={player.teamId} sport={sport} />
        </Suspense>
      ) : null}
      <PlayerCompetitionContext player={player} />
      <PlayerAnalysisSection player={player} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ScoutNotesPanel playerId={playerId} sport={sport} />
        <Suspense fallback={<SimilarSkeleton />}>
          <PlayerSimilarSection playerId={playerId} />
        </Suspense>
      </div>
        </>
      )}
    </div>
  );
}
