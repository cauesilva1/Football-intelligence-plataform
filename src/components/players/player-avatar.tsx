"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { parseApiSportsPlayerId } from "@/lib/api-sports";
import { getPositionAbbreviation, getTeamTheme } from "@/lib/team-theme";

export function PlayerAvatar({
  name,
  position,
  competitionName,
  teamName,
  photoUrl,
  apiSportsPlayerId,
  size = "md",
  className,
}: {
  name: string;
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

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const positionTag = getPositionAbbreviation(position);

  const sizeClass =
    size === "lg" ? "h-20 w-20 text-xl" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  const cdnUrl =
    apiSportsPlayerId != null
      ? `https://media.api-sports.io/football/players/${apiSportsPlayerId}.png`
      : parseApiSportsPlayerId(photoUrl) != null
        ? photoUrl
        : null;

  const imageSrc = !imageFailed ? photoUrl ?? cdnUrl : null;

  const fallback = (
    <div
      className={cn(
        "avatar-fallback relative flex aspect-square h-full w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br font-display font-bold shadow-panel ring-2 ring-white/20",
        theme.gradientString,
        sizeClass,
        className
      )}
      style={{ color: theme.text }}
      aria-hidden
    >
      <span className="relative z-10 tracking-tight drop-shadow-sm">{initials}</span>
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

  if (!imageSrc) return fallback;

  return (
    <div className={cn("relative aspect-square shrink-0 overflow-hidden rounded-xl", sizeClass, className)}>
      <img
        src={imageSrc}
        alt={name}
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
