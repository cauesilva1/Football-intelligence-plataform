import {
  classifyBasketballZone,
  isPlausibleCourtCoordinate,
  type BasketballShotZone,
} from "@/lib/basketball/shot-zones";

/**
 * ESPN NBA summary `plays[]`, verified 2026-10-05 on event 401898388:
 * - every play includes `coordinate`
 * - field goals (`shootingPlay`, `pointsAttempted` 2 or 3) carry court feet
 * - free throws are shooting plays with `pointsAttempted` 1 and a sentinel coordinate
 * - `participants[0].athlete.id` is the shooter (including on blocks)
 * - `scoringPlay` is true when the attempt drops
 * - `type.text` is the shot type ("Jump Shot", "Driving Layup Shot", …)
 */
export interface ParsedEspnShot {
  externalPlayId: string;
  espnAthleteId: string;
  x: number;
  y: number;
  made: boolean;
  zone: BasketballShotZone;
  shotType: string;
  pointsAttempted: 2 | 3;
}

export interface EspnShotParseResult {
  /** False when the payload has no `coordinate` field — callers must stop. */
  coordinatesAvailable: boolean;
  shots: ParsedEspnShot[];
  skippedInvalidCoordinate: number;
  skippedFreeThrow: number;
  skippedNotAShot: number;
}

export function espnNbaEventId(externalEventKey: string): string | null {
  const prefix = "espn:nba:";
  if (!externalEventKey.startsWith(prefix)) return null;
  const id = externalEventKey.slice(prefix.length);
  return /^\d+$/.test(id) ? id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readPlays(summary: unknown): unknown[] | null {
  if (!isRecord(summary) || !Array.isArray(summary.plays)) return null;
  return summary.plays;
}

export function espnSummaryHasShotCoordinates(summary: unknown): boolean {
  const plays = readPlays(summary);
  if (!plays || plays.length === 0) return false;
  return plays.some((play) => isRecord(play) && "coordinate" in play);
}

function readCoordinate(value: unknown): { x: number; y: number } | "missing" | "invalid" {
  if (!isRecord(value) || !("x" in value) || !("y" in value)) return "missing";
  const { x, y } = value;
  if (typeof x !== "number" || typeof y !== "number") return "invalid";
  if (!isPlausibleCourtCoordinate(x, y)) return "invalid";
  return { x, y };
}

function shooterId(play: Record<string, unknown>): string | null {
  const participants = play.participants;
  if (!Array.isArray(participants) || !isRecord(participants[0])) return null;
  const athlete = participants[0].athlete;
  if (!isRecord(athlete) || typeof athlete.id !== "string" || !athlete.id.trim()) return null;
  return athlete.id;
}

function shotTypeText(play: Record<string, unknown>): string {
  const type = play.type;
  if (isRecord(type) && typeof type.text === "string" && type.text.trim()) return type.text.trim();
  return "Unknown";
}

/**
 * Pull chartable field goals from an ESPN summary.
 * Does not invent coordinates: invalid or missing points are counted and dropped.
 */
export function parseEspnBasketballShots(summary: unknown): EspnShotParseResult {
  const coordinatesAvailable = espnSummaryHasShotCoordinates(summary);
  const empty: EspnShotParseResult = {
    coordinatesAvailable,
    shots: [],
    skippedInvalidCoordinate: 0,
    skippedFreeThrow: 0,
    skippedNotAShot: 0,
  };
  if (!coordinatesAvailable) return empty;

  const plays = readPlays(summary) ?? [];
  const shots: ParsedEspnShot[] = [];
  const seen = new Set<string>();

  for (const play of plays) {
    if (!isRecord(play)) {
      empty.skippedNotAShot += 1;
      continue;
    }
    if (play.shootingPlay !== true) {
      empty.skippedNotAShot += 1;
      continue;
    }

    const points = play.pointsAttempted;
    if (points === 1) {
      empty.skippedFreeThrow += 1;
      continue;
    }
    if (points !== 2 && points !== 3) {
      empty.skippedNotAShot += 1;
      continue;
    }

    const coordinate = readCoordinate(play.coordinate);
    if (coordinate === "missing" || coordinate === "invalid") {
      empty.skippedInvalidCoordinate += 1;
      continue;
    }

    const zone = classifyBasketballZone(coordinate.x, coordinate.y, points);
    const espnAthleteId = shooterId(play);
    const externalPlayId = typeof play.id === "string" ? play.id : "";
    if (!zone || !espnAthleteId || !externalPlayId || seen.has(externalPlayId)) {
      empty.skippedInvalidCoordinate += 1;
      continue;
    }
    seen.add(externalPlayId);

    shots.push({
      externalPlayId,
      espnAthleteId,
      x: coordinate.x,
      y: coordinate.y,
      made: play.scoringPlay === true,
      zone,
      shotType: shotTypeText(play),
      pointsAttempted: points,
    });
  }

  return { ...empty, shots };
}
