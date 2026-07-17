import type { Sport } from "@/lib/sport";
import { POSITION_GLOSSARY } from "@/components/common/glossary-tooltip";

export const BASKETBALL_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

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

export function getPositionGlossaryDescription(position: string, sport: Sport = "SOCCER"): string {
  if (sport === "BASKETBALL") {
    const normalized = normalizeBasketballPosition(position);
    return BASKETBALL_POSITION_GLOSSARY[normalized] ?? normalized;
  }

  if (sport === "AMERICAN_FOOTBALL") {
    const key = position.trim().toUpperCase();
    return AMERICAN_FOOTBALL_POSITION_GLOSSARY[key] ?? position;
  }

  return POSITION_GLOSSARY[position] ?? POSITION_GLOSSARY.MF;
}
