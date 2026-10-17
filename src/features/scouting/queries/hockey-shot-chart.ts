import { getPrisma } from "@/lib/prisma";
import { formatSeasonLabel } from "@/lib/format/season-label";
import { buildHockeyShotChart, type HockeyShotChartModel } from "@/lib/hockey/rink-geometry";

function campaignSeason(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const compact = value.trim().replace("/", "");
  if (!/^\d{6}$/.test(compact)) return null;
  const season = Number(compact);
  return Number.isInteger(season) ? season : null;
}

export async function queryHockeyShotChart(
  playerId: string,
  seasonParam: string | undefined
): Promise<HockeyShotChartModel> {
  const prisma = getPrisma();
  const seasonRows = await prisma.hockeyShot.findMany({
    where: { playerId },
    distinct: ["season"],
    select: { season: true },
    orderBy: { season: "desc" },
  });
  const seasons = seasonRows.map((row) => ({
    key: String(row.season),
    label: formatSeasonLabel(String(row.season), "HOCKEY"),
  }));
  const requested = campaignSeason(seasonParam);
  const selected = requested ?? seasonRows[0]?.season ?? null;
  const selectedSeason = selected != null ? String(selected) : (seasonParam ?? "");
  const rows =
    selected == null
      ? []
      : await prisma.hockeyShot.findMany({
          where: { playerId, season: selected },
          select: { x: true, y: true, made: true, gameId: true },
        });

  return buildHockeyShotChart({
    playerId,
    selectedSeason,
    seasonLabel: formatSeasonLabel(selectedSeason, "HOCKEY"),
    seasons,
    rows,
  });
}
