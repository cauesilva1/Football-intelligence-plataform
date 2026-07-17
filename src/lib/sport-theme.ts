import type { ComponentType } from "react";
import type { Sport } from "@/lib/sport";
import { getSportConfig } from "@/lib/sport-registry";
import {
  AmericanFootballIcon,
  BasketballIcon,
  SoccerBallIcon,
} from "@/components/icons/sport-balls";

type SportIcon = ComponentType<{ className?: string; title?: string }>;

const SPORT_ICONS: Record<Sport, SportIcon> = {
  SOCCER: SoccerBallIcon,
  BASKETBALL: BasketballIcon,
  AMERICAN_FOOTBALL: AmericanFootballIcon,
};

export function sportTheme(sport: Sport) {
  const config = getSportConfig(sport);
  const icon = SPORT_ICONS[sport] ?? SoccerBallIcon;
  return {
    label: config.label,
    shortLabel: config.shortLabel,
    tagline: config.tagline,
    icon,
    brandIcon: icon,
  };
}

/** @deprecated Prefer sportTheme(sport) — kept for call sites that index by Sport. */
export const SPORT_THEME = {
  SOCCER: sportTheme("SOCCER"),
  BASKETBALL: sportTheme("BASKETBALL"),
  AMERICAN_FOOTBALL: sportTheme("AMERICAN_FOOTBALL"),
} as const;

export function applySportToDocument(sport: Sport): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-sport", sport);
}
