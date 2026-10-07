import { getPrisma } from "@/lib/prisma";
import { formatSeasonLabel } from "@/lib/format/season-label";
import {
  BASKETBALL_SHOT_ZONES,
  ZONE_LABELS,
  fgPctOrNull,
  isBasketballShotZone,
  zoneEfficiencyFill,
  type BasketballShotZone,
} from "@/lib/basketball/shot-zones";

export interface NbaShotZoneLine {
  zone: BasketballShotZone;
  label: string;
  attempts: number;
  made: number;
  /** Null when the zone has fewer than 5 attempts — do not render a percentage. */
  fgPct: number | null;
  fill: string;
  ink: string;
}

export interface NbaShotChartModel {
  playerId: string;
  selectedSeason: string;
  seasonLabel: string;
  seasons: Array<{ key: string; label: string }>;
  attempts: number;
  made: number;
  fgPct: number | null;
  zones: NbaShotZoneLine[];
}

export function parseCampaignSeason(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const compact = value.trim().replace("/", "");
  if (!/^\d{6}$/.test(compact)) return null;
  const season = Number(compact);
  return Number.isInteger(season) ? season : null;
}

function emptyZones(): NbaShotZoneLine[] {
  return BASKETBALL_SHOT_ZONES.map((zone) => {
    const paint = zoneEfficiencyFill(null, 0);
    return {
      zone,
      label: ZONE_LABELS[zone],
      attempts: 0,
      made: 0,
      fgPct: null,
      fill: paint.fill,
      ink: paint.ink,
    };
  });
}

export async function queryNbaShotChart(
  playerId: string,
  seasonParam: string | undefined
): Promise<NbaShotChartModel> {
  const prisma = getPrisma();
  const seasonRows = await prisma.$queryRaw<Array<{ season: number }>>`
    SELECT DISTINCT season
    FROM basketball_shots
    WHERE "playerId" = ${playerId}
    ORDER BY season DESC
  `;
  const seasons = seasonRows.map((row) => ({
    key: String(row.season),
    label: formatSeasonLabel(String(row.season)),
  }));
  const requested = parseCampaignSeason(seasonParam);
  const selected =
    (requested != null && seasons.some((season) => season.key === String(requested))
      ? requested
      : seasonRows[0]?.season) ?? requested;

  const base: NbaShotChartModel = {
    playerId,
    selectedSeason: selected != null ? String(selected) : (seasonParam ?? ""),
    seasonLabel: formatSeasonLabel(selected != null ? String(selected) : (seasonParam ?? "")),
    seasons,
    attempts: 0,
    made: 0,
    fgPct: null,
    zones: emptyZones(),
  };
  if (selected == null) return base;

  const rows = await prisma.$queryRaw<Array<{ zone: string; attempts: number; made: number }>>`
    SELECT zone,
           COUNT(*)::int AS attempts,
           COALESCE(SUM(CASE WHEN made THEN 1 ELSE 0 END), 0)::int AS made
    FROM basketball_shots
    WHERE "playerId" = ${playerId} AND season = ${selected}
    GROUP BY zone
  `;

  const byZone = new Map<BasketballShotZone, { attempts: number; made: number }>();
  let attempts = 0;
  let made = 0;
  for (const row of rows) {
    const zoneAttempts = Number(row.attempts);
    const zoneMade = Number(row.made);
    attempts += zoneAttempts;
    made += zoneMade;
    if (isBasketballShotZone(row.zone)) {
      byZone.set(row.zone, { attempts: zoneAttempts, made: zoneMade });
    }
  }

  return {
    ...base,
    attempts,
    made,
    fgPct: fgPctOrNull(made, attempts),
    zones: BASKETBALL_SHOT_ZONES.map((zone) => {
      const line = byZone.get(zone) ?? { attempts: 0, made: 0 };
      const fgPct = fgPctOrNull(line.made, line.attempts);
      const paint = zoneEfficiencyFill(fgPct, line.attempts);
      return {
        zone,
        label: ZONE_LABELS[zone],
        attempts: line.attempts,
        made: line.made,
        fgPct,
        fill: paint.fill,
        ink: paint.ink,
      };
    }),
  };
}
