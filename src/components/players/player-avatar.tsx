"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlayerInitials, resolvePlayerPhotoUrl } from "@/lib/player-media";
import { getPositionAbbreviation, getTeamTheme } from "@/lib/team-theme";

export function PlayerAvatar({
  name,
  fullName,
  position,
  competitionName,
  teamName,
  photoUrl,
  apiSportsPlayerId,
  size = "md",
  className,
}: {
  name: string;
  fullName?: string;
  position: string;
  competitionName?: string | null;
  teamName?: string | null;
  photoUrl?: string | null;
  apiSportsPlayerId?: number | string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const theme = getTeamTheme(competitionName, teamName);
  const [imageFailed, setImageFailed] = useState(false);

  const parsedApiId =
    apiSportsPlayerId != null && apiSportsPlayerId !== ""
      ? Number(apiSportsPlayerId)
      : undefined;

  const resolvedPhotoUrl = resolvePlayerPhotoUrl({
    photoUrl,
    apiSportsId: Number.isFinite(parsedApiId) ? parsedApiId : null,
  });

  const initials = getPlayerInitials(name, fullName);
  const positionTag = getPositionAbbreviation(position);

  const sizeClass =
    size === "lg" ? "h-20 w-20 text-xl" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  const iconSize = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  const fallback = (
    <div
      className={cn(
        "avatar-fallback relative flex aspect-square h-full w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br font-display font-bold shadow-panel ring-2 ring-white/20",
        theme.gradientString,
        sizeClass,
        className
      )}
      style={{ color: theme.text }}
      role="img"
      aria-label={`${fullName ?? name} avatar`}
    >
      {initials ? (
        <span className="relative z-10 tracking-tight drop-shadow-sm">{initials}</span>
      ) : (
        <UserRound className={cn("relative z-10 opacity-90", iconSize)} aria-hidden />
      )}
      <span
        className={cn(
          "absolute rounded font-semibold leading-none shadow-sm",
          size === "lg" ? "bottom-1.5 px-2 py-0.5 text-[10px]" : "bottom-0.5 right-0.5 px-1 py-px text-[8px]"
        )}
        style={{ backgroundColor: theme.accent, color: theme.gradientTo }}
      >
        {positionTag}
      </span>
    </div>
  );

  const imageSrc = !imageFailed ? resolvedPhotoUrl : undefined;

  if (!imageSrc) return fallback;

  return (
    <div className={cn("relative aspect-square shrink-0 overflow-hidden rounded-xl", sizeClass, className)}>
      <img
        src={imageSrc}
        alt={fullName ?? name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          "aspect-square h-full w-full rounded-xl object-cover ring-1 ring-white/10",
          imageFailed ? "hidden" : "block"
        )}
        onError={() => setImageFailed(true)}
      />
      {imageFailed ? fallback : null}
    </div>
  );
}
