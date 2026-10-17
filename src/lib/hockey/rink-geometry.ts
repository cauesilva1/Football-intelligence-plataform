import { isPlausibleNhlCoordinate } from "@/lib/api/nhl";
import { fgPctOrNull, zoneEfficiencyFill } from "@/lib/basketball/shot-zones";

/** NHL rink: 200 ft by 85 ft. Goal lines sit 11 ft in from the end boards. */
export const RINK_HALF_LENGTH = 100;
export const RINK_HALF_WIDTH = 42.5;
export const GOAL_LINE_X = 89;
export const BLUE_LINE_X = 25;
export const FACEOFF_X = 69;
export const FACEOFF_Y = 22;
export const FACEOFF_RADIUS = 15;

export const HOCKEY_SHOT_ZONES = ["slot", "circles", "point", "perimeter"] as const;
export type HockeyShotZone = (typeof HOCKEY_SHOT_ZONES)[number];

export const HOCKEY_ZONE_LABELS: Record<HockeyShotZone, string> = {
  slot: "Slot",
  circles: "Circles",
  point: "Point",
  perimeter: "Perimeter",
};

export type HockeyRinkView = "offense" | "full";

export function parseHockeyRinkView(value: string | undefined): HockeyRinkView {
  return value === "full" ? "full" : "offense";
}

/**
 * Stored NHL coordinates are a fixed rink frame, so period changes put the
 * same shooter at opposite nets. Fold every shot onto the positive-x net
 * with a 180° turn so the angle to the goal is preserved.
 */
export function normalizeNhlAttackingCoordinate(
  x: number,
  y: number
): { x: number; y: number } | null {
  if (!isPlausibleNhlCoordinate(x, y)) return null;
  if (x < 0) return { x: -x, y: -y };
  return { x, y };
}

export function classifyHockeyZone(x: number, y: number): HockeyShotZone | null {
  const point = normalizeNhlAttackingCoordinate(x, y);
  if (!point) return null;
  if (point.x >= FACEOFF_X && Math.abs(point.y) <= FACEOFF_Y) return "slot";
  const inCircle =
    Math.hypot(point.x - FACEOFF_X, point.y - FACEOFF_Y) <= FACEOFF_RADIUS ||
    Math.hypot(point.x - FACEOFF_X, point.y + FACEOFF_Y) <= FACEOFF_RADIUS;
  if (inCircle) return "circles";
  if (point.x < FACEOFF_X - FACEOFF_RADIUS) return "point";
  return "perimeter";
}

export interface HockeyShotRow {
  x: number;
  y: number;
  made: boolean;
  gameId: string;
}

export interface HockeyShotMark {
  x: number;
  y: number;
  made: boolean;
  zone: HockeyShotZone;
}

export interface HockeyShotZoneLine {
  zone: HockeyShotZone;
  label: string;
  attempts: number;
  made: number;
  shootingPct: number | null;
  fill: string;
}

export interface HockeyShotChartModel {
  playerId: string;
  selectedSeason: string;
  seasonLabel: string;
  seasons: Array<{ key: string; label: string }>;
  attempts: number;
  goals: number;
  shootingPct: number | null;
  trackedGames: number;
  zones: HockeyShotZoneLine[];
  shots: HockeyShotMark[];
}

export function buildHockeyShotChart(input: {
  playerId: string;
  selectedSeason: string;
  seasonLabel: string;
  seasons: Array<{ key: string; label: string }>;
  rows: HockeyShotRow[];
}): HockeyShotChartModel {
  const shots: HockeyShotMark[] = [];
  const games = new Set<string>();
  const tally = new Map<HockeyShotZone, { attempts: number; made: number }>();
  for (const zone of HOCKEY_SHOT_ZONES) tally.set(zone, { attempts: 0, made: 0 });

  for (const row of input.rows) {
    const point = normalizeNhlAttackingCoordinate(row.x, row.y);
    const zone = point ? classifyHockeyZone(row.x, row.y) : null;
    if (!point || !zone) continue;
    shots.push({ x: point.x, y: point.y, made: row.made, zone });
    games.add(row.gameId);
    const bucket = tally.get(zone)!;
    bucket.attempts += 1;
    if (row.made) bucket.made += 1;
  }

  const goals = shots.filter((shot) => shot.made).length;
  return {
    playerId: input.playerId,
    selectedSeason: input.selectedSeason,
    seasonLabel: input.seasonLabel,
    seasons: input.seasons,
    attempts: shots.length,
    goals,
    shootingPct: fgPctOrNull(goals, shots.length),
    trackedGames: games.size,
    zones: HOCKEY_SHOT_ZONES.map((zone) => {
      const line = tally.get(zone)!;
      const shootingPct = fgPctOrNull(line.made, line.attempts);
      return {
        zone,
        label: HOCKEY_ZONE_LABELS[zone],
        attempts: line.attempts,
        made: line.made,
        shootingPct,
        fill: zoneEfficiencyFill(shootingPct, line.attempts).fill,
      };
    }),
    shots,
  };
}
