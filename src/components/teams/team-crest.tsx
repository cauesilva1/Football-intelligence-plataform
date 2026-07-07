"use client";

import { cn } from "@/lib/utils";
import { CrestImage } from "@/components/teams/crest-image";
import { resolveClubCrestUrlSync } from "@/lib/crests/club-crests";
import { getTeamTheme } from "@/lib/team-theme";

export function TeamCrest({
  name,
  crestUrl,
  competitionName,
  apiSportsId,
  size = "lg",
  className,
}: {
  name: string;
  crestUrl?: string | null;
  competitionName?: string | null;
  apiSportsId?: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const theme = getTeamTheme(competitionName, name);
  const resolvedUrl = resolveClubCrestUrlSync(name, crestUrl, apiSportsId);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const sizeClass = size === "lg" ? "h-20 w-20 text-2xl" : "h-12 w-12 text-lg";

  return (
    <CrestImage
      src={resolvedUrl}
      alt={`Escudo ${name}`}
      theme={theme}
      fallbackLabel={initial}
      sizeClass={cn(sizeClass, className)}
      imageClassName={size === "lg" ? "p-2 rounded-2xl" : "rounded-2xl"}
      fallbackClassName="rounded-2xl"
    />
  );
}
