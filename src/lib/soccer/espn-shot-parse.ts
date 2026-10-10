import { classifySoccerZone, normalizeAttackingPoint, type SoccerShotZone } from "@/lib/soccer/shot-zones";

export interface ParsedSoccerShot {
  externalPlayId: string;
  espnAthleteId: string | null;
  shooterName: string | null;
  x: number;
  y: number;
  converted: boolean;
  zone: SoccerShotZone;
  shotType: string;
}

export interface SoccerShotParseResult {
  shots: ParsedSoccerShot[];
  skippedInvalidCoordinate: number;
  skippedNotAShot: number;
}

interface EspnAthleteRef {
  id?: string | number;
  $ref?: string;
}

interface EspnShotPlay {
  id?: string | number;
  type?: { type?: string; text?: string };
  text?: string;
  scoringPlay?: boolean;
  ownGoal?: boolean;
  fieldPositionX?: number | null;
  fieldPositionY?: number | null;
  fieldPosition2X?: number | null;
  participants?: Array<{ athlete?: EspnAthleteRef }>;
}

/** Finalizations only. Goal kicks, assists, and blocked passes are not shots. */
export function isSoccerShotEventType(typeSlug: string | undefined): boolean {
  if (!typeSlug) return false;
  if (typeSlug === "goal-kick" || typeSlug === "assists-shot" || typeSlug === "blocked-pass") {
    return false;
  }
  if (typeSlug.startsWith("shot-")) return true;
  if (typeSlug === "goal" || typeSlug.startsWith("goal---") || typeSlug.startsWith("goal-")) return true;
  if (typeSlug.startsWith("penalty---")) return true;
  return false;
}

export function isConvertedSoccerShot(typeSlug: string, scoringPlay: boolean): boolean {
  if (scoringPlay) return true;
  if (typeSlug === "shot-on-target") return true;
  if (typeSlug === "goal" || typeSlug.startsWith("goal---")) return true;
  if (typeSlug.startsWith("penalty---") && typeSlug.includes("scored")) return true;
  return false;
}

/** ESPN writes the shooter as "Name (Club)". The first such pair is the shooter. */
export function shooterNameFromPlayText(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(
    /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]+){0,3})\s+\([^)]+\)/
  );
  const name = match?.[1]?.trim();
  return name || null;
}

/**
 * Some MLS games send 0–1 fractions (0.43) and others send 0–100 (70.0).
 * When both axes are at most 1, they are fractions.
 */
export function asPitchPercent(x: number, y: number): { x: number; y: number } {
  if (x <= 1 && y <= 1) return { x: x * 100, y: y * 100 };
  return { x, y };
}

function athleteId(play: EspnShotPlay): string | null {
  for (const participant of play.participants ?? []) {
    const athlete = participant.athlete;
    if (athlete?.id != null && /^\d+$/.test(String(athlete.id))) return String(athlete.id);
    const match = athlete?.$ref?.match(/\/athletes\/(\d+)/);
    if (match) return match[1];
  }
  return null;
}

export function parseSoccerShotPlay(play: EspnShotPlay): ParsedSoccerShot | "not-a-shot" | "invalid" | "no-player" {
  const typeSlug = play.type?.type;
  if (play.ownGoal || !isSoccerShotEventType(typeSlug)) return "not-a-shot";
  if (play.id == null) return "no-player";
  const espnAthleteId = athleteId(play);
  const shooterName = shooterNameFromPlayText(play.text);
  if (!espnAthleteId && !shooterName) return "no-player";

  const rawX = play.fieldPositionX;
  const rawY = play.fieldPositionY;
  if (typeof rawX !== "number" || typeof rawY !== "number") return "invalid";
  const scaled = asPitchPercent(rawX, rawY);
  const rawTarget = typeof play.fieldPosition2X === "number" ? play.fieldPosition2X : null;
  const target =
    rawTarget == null ? null : rawX <= 1 && rawY <= 1 && rawTarget <= 1 ? rawTarget * 100 : rawTarget;
  const point = normalizeAttackingPoint(scaled.x, scaled.y, target);
  if (!point) return "invalid";
  const zone = classifySoccerZone(point.x, point.y);
  if (!zone) return "invalid";

  return {
    externalPlayId: String(play.id),
    espnAthleteId,
    shooterName,
    x: point.x,
    y: point.y,
    converted: isConvertedSoccerShot(typeSlug!, Boolean(play.scoringPlay)),
    zone,
    shotType: typeSlug!,
  };
}

export function parseSoccerShotPlays(plays: unknown[]): SoccerShotParseResult {
  const shots: ParsedSoccerShot[] = [];
  let skippedInvalidCoordinate = 0;
  let skippedNotAShot = 0;
  for (const play of plays) {
    const parsed = parseSoccerShotPlay(play as EspnShotPlay);
    if (parsed === "not-a-shot") {
      skippedNotAShot += 1;
      continue;
    }
    if (parsed === "invalid" || parsed === "no-player") {
      if (parsed === "invalid") skippedInvalidCoordinate += 1;
      continue;
    }
    shots.push(parsed);
  }
  return { shots, skippedInvalidCoordinate, skippedNotAShot };
}
