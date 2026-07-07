"use client";

import { cn } from "@/lib/utils";
import { CrestImage } from "@/components/teams/crest-image";
import { resolveNationalCrestUrlSync } from "@/lib/crests/national-teams";
import { getNationalTeamTheme } from "@/lib/team-theme";

export function NationalTeamCrest({
  name,
  crestUrl,
  size = "md",
  className,
}: {
  name: string;
  crestUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const theme = getNationalTeamTheme(name);
  const resolvedUrl = crestUrl ?? resolveNationalCrestUrlSync(name, size === "sm" ? 64 : size === "lg" ? 96 : 80);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const sizeClass =
    size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  return (
    <CrestImage
      src={resolvedUrl}
      alt={`Seleção ${name}`}
      theme={theme}
      fallbackLabel={initial}
      sizeClass={cn(sizeClass, className)}
    />
  );
}
