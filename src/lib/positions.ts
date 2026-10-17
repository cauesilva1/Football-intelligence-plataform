import type { Sport } from "@/lib/sport";
import { POSITION_GLOSSARY } from "@/components/common/glossary-copy";

export const BASKETBALL_POSITIONS = ["PG", "SG", "G", "SF", "PF", "C"] as const;

/** Desk and rankings filters. Generic ESPN "G" stays out of this list and displays as Guard. */
export const BASKETBALL_FILTER_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

export const HOCKEY_POSITIONS = ["C", "LW", "RW", "D", "G"] as const;

const HOCKEY_POSITION_SET = new Set<string>(HOCKEY_POSITIONS);

/** NHL codes only. Soccer abbreviations (CDM, ST, FW) never pass through. */
export function formatHockeyPositionLabel(position?: string | null): string {
  const key = position?.trim().toUpperCase() ?? "";
  if (key === "L") return "LW";
  if (key === "R") return "RW";
  if (HOCKEY_POSITION_SET.has(key)) return key;
  return "—";
}

/** Stick side stored on preferredFoot. Empty when the feed did not say. */
export function formatHockeyShootsLabel(preferredFoot?: string | null): string | null {
  if (preferredFoot === "LEFT") return "Shoots L";
  if (preferredFoot === "RIGHT") return "Shoots R";
  return null;
}

export const AMERICAN_FOOTBALL_POSITIONS = [
  "QB",
  "RB",
  "WR",
  "TE",
  "OL",
  "DL",
  "LB",
  "CB",
  "S",
  "K",
  "P",
] as const;

export const BASKETBALL_POSITION_GLOSSARY: Record<string, string> = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  G: "Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C: "Center",
};

export const AMERICAN_FOOTBALL_POSITION_GLOSSARY: Record<string, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  WR: "Wide Receiver",
  TE: "Tight End",
  OL: "Offensive Line",
  DL: "Defensive Line",
  LB: "Linebacker",
  CB: "Cornerback",
  S: "Safety",
  K: "Kicker",
  P: "Punter",
};

/** Legado PT-BR → padrão americano. */
export const LEGACY_BASKETBALL_POSITION_MAP: Record<string, string> = {
  Armador: "PG",
  "Ala-Armador": "SG",
  Ala: "SF",
  "Ala-Pivô": "PF",
  Pivô: "C",
};

export function normalizeBasketballPosition(position?: string | null): string {
  if (!position?.trim()) return "SF";
  const trimmed = position.trim();
  if ((BASKETBALL_POSITIONS as readonly string[]).includes(trimmed)) return trimmed;
  return LEGACY_BASKETBALL_POSITION_MAP[trimmed] ?? trimmed;
}

/** Badge text. Generic ESPN "Guard" stays Guard, not Point Guard. */
export function formatBasketballPositionLabel(position?: string | null): string {
  const normalized = normalizeBasketballPosition(position);
  if (normalized === "G") return "Guard";
  return normalized;
}

export function getPositionGlossaryDescription(position: string, sport: Sport = "SOCCER"): string {
  if (sport === "BASKETBALL") {
    const normalized = normalizeBasketballPosition(position);
    return BASKETBALL_POSITION_GLOSSARY[normalized] ?? normalized;
  }

  if (sport === "AMERICAN_FOOTBALL") {
    const key = position.trim().toUpperCase();
    return AMERICAN_FOOTBALL_POSITION_GLOSSARY[key] ?? position;
  }

  if (sport === "HOCKEY") {
    const key = position.trim().toUpperCase();
    const labels: Record<string, string> = {
      C: "Center",
      LW: "Left wing",
      RW: "Right wing",
      D: "Defense",
      G: "Goalie",
    };
    return labels[key] ?? position;
  }

  return POSITION_GLOSSARY[position] ?? POSITION_GLOSSARY.MF;
}
