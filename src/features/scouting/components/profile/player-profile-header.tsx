import Link from "next/link";
import {
  GitCompareArrows,
  FileText,
  Ruler,
  Weight,
  Footprints,
  ShieldHalf,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { GlossaryTooltip, POSITION_GLOSSARY } from "@/components/common/glossary-tooltip";
import { ShortlistButton } from "@/features/shortlist/components/shortlist-button";
import { derivePlayerStatus } from "@/features/scouting/lib/player-status";
import { NationalTeamCrest } from "@/features/tournaments/components/national-team-crest";
import { getTeamTheme } from "@/lib/team-theme";
import { cn, formatMarketValue, formatPhysicalMetric, formatPreferredFoot, ratingColor } from "@/lib/utils";
import type { Player } from "@/types";

export function PlayerProfileHeader({
  player,
  isShortlisted,
}: {
  player: Player;
  isShortlisted: boolean;
}) {
  const stats = player.currentSeasonStats;
  const status = derivePlayerStatus(stats);
  const theme = getTeamTheme(player.competitionName, player.teamName);

  const statusVariant =
    status.variant === "default"
      ? "default"
      : status.variant === "azure"
        ? "azure"
        : status.variant === "amber"
          ? "amber"
          : "neutral";

  const heightLabel = formatPhysicalMetric(player.height, "cm");
  const weightLabel = formatPhysicalMetric(player.weight, "kg");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-panel",
        "bg-gradient-to-br",
        theme.gradientString
      )}
      style={{ borderColor: `${theme.primaryColor}44` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at top right, ${theme.primaryColor}55 0%, transparent 60%)`,
        }}
      />
      <div className="relative flex flex-col gap-6 p-5 lg:flex-row lg:items-start lg:justify-between lg:p-7">
        <div className="flex min-w-0 gap-4">
          <PlayerAvatar
            name={player.knownAs}
            position={player.position}
            competitionName={player.competitionName}
            teamName={player.teamName}
            photoUrl={player.photoUrl}
            apiSportsPlayerId={player.apiSportsId}
            size="lg"
            className="ring-2 ring-white/20"
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
                {player.fullName}
              </h1>
              <Badge variant={statusVariant}>{status.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GlossaryTooltip
                label={<Badge variant="neutral">{player.position}</Badge>}
                description={POSITION_GLOSSARY[player.position] ?? POSITION_GLOSSARY.MF}
              />
              {player.secondaryPosition && (
                <GlossaryTooltip
                  label={<Badge variant="secondary">{player.secondaryPosition}</Badge>}
                  description={POSITION_GLOSSARY[player.secondaryPosition] ?? POSITION_GLOSSARY.MF}
                />
              )}
              <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
                <NationalTeamCrest name={player.nationality} size="sm" className="h-5 w-5 text-[9px]" />
                {player.nationality} · {player.age} years old
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
              <span className="inline-flex items-center gap-1">
                <ShieldHalf className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                <span className="font-medium text-white/90">
                  {player.teamName ?? "No club"}
                  {player.teamShortName ? ` (${player.teamShortName})` : ""}
                </span>
              </span>
              {heightLabel && (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5" /> {heightLabel}
                </span>
              )}
              {weightLabel && (
                <span className="inline-flex items-center gap-1">
                  <Weight className="h-3.5 w-3.5" /> {weightLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5" /> {formatPreferredFoot(player.preferredFoot)}
              </span>
            </div>
            <div className="text-2xs text-white/60">{status.description}</div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end lg:flex-col lg:items-end">
          <div className="flex gap-6">
            <div>
              <div className="text-2xs font-medium uppercase tracking-wider text-white/60">Rating</div>
              <div className={`font-display text-2xl font-bold tabular-nums ${ratingColor(stats.rating)}`}>
                {stats.rating.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-2xs font-medium uppercase tracking-wider text-white/60">Market Value</div>
              <div className="font-display text-2xl font-bold tabular-nums text-white">
                {formatMarketValue(player.marketValue)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShortlistButton playerId={player.id} initialSaved={isShortlisted} />
            <Link href={`/compare?playerA=${player.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <GitCompareArrows className="h-3.5 w-3.5" /> Compare
            </Link>
            <Link href={`/reports?playerId=${player.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <FileText className="h-3.5 w-3.5" /> Scout Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
