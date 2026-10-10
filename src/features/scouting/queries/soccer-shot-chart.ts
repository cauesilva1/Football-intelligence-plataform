import { getPrisma } from "@/lib/prisma";
import { formatSeasonLabel } from "@/lib/format/season-label";
import {
  SOCCER_SHOT_ZONES,
  SOCCER_ZONE_LABELS,
  conversionPctOrNull,
  isSoccerShotZone,
  zoneConversionFill,
  type SoccerShotZone,
} from "@/lib/soccer/shot-zones";

export interface SoccerShotZoneLine {
  zone: SoccerShotZone;
  label: string;
  attempts: number;
  converted: number;
  /** Null when the zone has fewer than 5 attempts. */
  conversionPct: number | null;
  fill: string;
  ink: string;
}

export interface SoccerShotMark {
  x: number;
  y: number;
  converted: boolean;
  zone: SoccerShotZone;
}

export interface SoccerShotChartModel {
  selectedSeason: string;
  seasonLabel: string;
  seasons: Array<{ key: string; label: string }>;
  attempts: number;
  converted: number;
  conversionPct: number | null;
  trackedGames: number;
  zones: SoccerShotZoneLine[];
  shots: SoccerShotMark[];
}

function emptyZones(): SoccerShotZoneLine[] {
  return SOCCER_SHOT_ZONES.map((zone) => {
    const paint = zoneConversionFill(null, 0);
    return {
      zone,
      label: SOCCER_ZONE_LABELS[zone],
      attempts: 0,
      converted: 0,
      conversionPct: null,
      fill: paint.fill,
      ink: paint.ink,
    };
  });
}

function parseSeason(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const compact = value.trim().replace("/", "");
  if (!/^\d{4}(\d{2})?$/.test(compact)) return null;
  const season = Number(compact);
  return Number.isInteger(season) ? season : null;
}

async function loadChart(
  seasonRows: Array<{ season: number }>,
  seasonParam: string | undefined,
  whereSql: { attempts: Promise<Array<{ zone: string; attempts: number; converted: number }>>; shots: Promise<Array<{ x: number; y: number; converted: boolean; zone: string }>>; games: Promise<Array<{ games: number }>> }
): Promise<SoccerShotChartModel> {
  const seasons = seasonRows.map((row) => ({
    key: String(row.season),
    label: formatSeasonLabel(String(row.season)),
  }));
  const requested = parseSeason(seasonParam);
  const selected = requested ?? seasonRows[0]?.season ?? null;
  const base: SoccerShotChartModel = {
    selectedSeason: selected != null ? String(selected) : (seasonParam ?? ""),
    seasonLabel: formatSeasonLabel(selected != null ? String(selected) : (seasonParam ?? "")),
    seasons,
    attempts: 0,
    converted: 0,
    conversionPct: null,
    trackedGames: 0,
    zones: emptyZones(),
    shots: [],
  };
  if (selected == null) return base;

  const [rows, shotRows, gameRows] = await Promise.all([whereSql.attempts, whereSql.shots, whereSql.games]);
  const byZone = new Map<SoccerShotZone, { attempts: number; converted: number }>();
  let attempts = 0;
  let converted = 0;
  for (const row of rows) {
    const zoneAttempts = Number(row.attempts);
    const zoneConverted = Number(row.converted);
    attempts += zoneAttempts;
    converted += zoneConverted;
    if (isSoccerShotZone(row.zone)) {
      byZone.set(row.zone, { attempts: zoneAttempts, converted: zoneConverted });
    }
  }

  return {
    ...base,
    attempts,
    converted,
    conversionPct: conversionPctOrNull(converted, attempts),
    trackedGames: Number(gameRows[0]?.games ?? 0),
    zones: SOCCER_SHOT_ZONES.map((zone) => {
      const line = byZone.get(zone) ?? { attempts: 0, converted: 0 };
      const conversionPct = conversionPctOrNull(line.converted, line.attempts);
      const paint = zoneConversionFill(conversionPct, line.attempts);
      return {
        zone,
        label: SOCCER_ZONE_LABELS[zone],
        attempts: line.attempts,
        converted: line.converted,
        conversionPct,
        fill: paint.fill,
        ink: paint.ink,
      };
    }),
    shots: shotRows.flatMap((shot) =>
      isSoccerShotZone(shot.zone)
        ? [{ x: Number(shot.x), y: Number(shot.y), converted: Boolean(shot.converted), zone: shot.zone }]
        : []
    ),
  };
}

export async function querySoccerShotChart(
  playerId: string,
  seasonParam: string | undefined
): Promise<SoccerShotChartModel> {
  const prisma = getPrisma();
  const seasonRows = await prisma.$queryRaw<Array<{ season: number }>>`
    SELECT DISTINCT season
    FROM soccer_shots
    WHERE "playerId" = ${playerId}
    ORDER BY season DESC
  `;
  const requested = parseSeason(seasonParam);
  const selected = requested ?? seasonRows[0]?.season ?? null;
  if (selected == null) {
    return loadChart(seasonRows, seasonParam, {
      attempts: Promise.resolve([]),
      shots: Promise.resolve([]),
      games: Promise.resolve([]),
    });
  }
  return loadChart(seasonRows, seasonParam, {
    attempts: prisma.$queryRaw`
      SELECT zone,
             COUNT(*)::int AS attempts,
             COALESCE(SUM(CASE WHEN converted THEN 1 ELSE 0 END), 0)::int AS converted
      FROM soccer_shots
      WHERE "playerId" = ${playerId} AND season = ${selected}
      GROUP BY zone
    `,
    shots: prisma.$queryRaw`
      SELECT x, y, converted, zone
      FROM soccer_shots
      WHERE "playerId" = ${playerId} AND season = ${selected}
    `,
    games: prisma.$queryRaw`
      SELECT COUNT(DISTINCT "gameId")::int AS games
      FROM soccer_shots
      WHERE "playerId" = ${playerId} AND season = ${selected} AND "gameId" <> ''
    `,
  });
}

export async function querySoccerTeamShotChart(
  teamId: string,
  seasonParam: string | undefined
): Promise<SoccerShotChartModel> {
  const prisma = getPrisma();
  const seasonRows = await prisma.$queryRaw<Array<{ season: number }>>`
    SELECT DISTINCT s.season
    FROM soccer_shots s
    JOIN player_match_stats p
      ON p."playerId" = s."playerId"
     AND p."externalEventKey" LIKE '%:' || s."gameId"
    JOIN teams t ON t.id = ${teamId} AND lower(t.name) = lower(p."teamName")
    ORDER BY s.season DESC
  `;
  const requested = parseSeason(seasonParam);
  const selected = requested ?? seasonRows[0]?.season ?? null;
  if (selected == null) {
    return loadChart(seasonRows, seasonParam, {
      attempts: Promise.resolve([]),
      shots: Promise.resolve([]),
      games: Promise.resolve([]),
    });
  }
  return loadChart(seasonRows, seasonParam, {
    attempts: prisma.$queryRaw`
      SELECT s.zone,
             COUNT(*)::int AS attempts,
             COALESCE(SUM(CASE WHEN s.converted THEN 1 ELSE 0 END), 0)::int AS converted
      FROM soccer_shots s
      JOIN player_match_stats p
        ON p."playerId" = s."playerId"
       AND p."externalEventKey" LIKE '%:' || s."gameId"
      JOIN teams t ON t.id = ${teamId} AND lower(t.name) = lower(p."teamName")
      WHERE s.season = ${selected}
      GROUP BY s.zone
    `,
    shots: prisma.$queryRaw`
      SELECT s.x, s.y, s.converted, s.zone
      FROM soccer_shots s
      JOIN player_match_stats p
        ON p."playerId" = s."playerId"
       AND p."externalEventKey" LIKE '%:' || s."gameId"
      JOIN teams t ON t.id = ${teamId} AND lower(t.name) = lower(p."teamName")
      WHERE s.season = ${selected}
    `,
    games: prisma.$queryRaw`
      SELECT COUNT(DISTINCT s."gameId")::int AS games
      FROM soccer_shots s
      JOIN player_match_stats p
        ON p."playerId" = s."playerId"
       AND p."externalEventKey" LIKE '%:' || s."gameId"
      JOIN teams t ON t.id = ${teamId} AND lower(t.name) = lower(p."teamName")
      WHERE s.season = ${selected} AND s."gameId" <> ''
    `,
  });
}
