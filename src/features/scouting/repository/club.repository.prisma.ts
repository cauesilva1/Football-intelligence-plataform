import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { CURRENT_SEASON } from "@/lib/seasons";
import { syncEspnMatchesForCompetition } from "@/lib/api/espn-matches";
import {
  fetchPlayerProfile,
  parseFoundedYear,
  resolveTransfermarktClubId,
  searchTransfermarktClub,
  searchTransfermarktPlayer,
  syncClub,
  transfermarktCrestUrl,
  transfermarktPlayerPhotoUrl,
  type TransfermarktClubProfile,
  type TransfermarktPlayerProfile,
  type TransfermarktSquadPlayer,
} from "@/lib/api/transfermarkt";
import { namesLikelyMatch, needsMatchSync, needsPlayerSync, needsTeamSync } from "@/lib/sync/data-staleness";
import { resolvePlayerPhotoUrl } from "@/lib/player-media";

type DbPlayer = Prisma.PlayerGetPayload<{
  include: {
    team: { include: { competition: true } };
    statistics: true;
  };
}>;
type DbTeam = Prisma.TeamGetPayload<{
  include: {
    competition: true;
    statistics: { where: { season: string } };
  };
}>;

function mapPosition(raw?: string): string {
  if (!raw) return "CM";
  const value = raw.toLowerCase();
  if (value.includes("goal")) return "GK";
  if (value.includes("centre-back") || value.includes("center-back")) return "CB";
  if (value.includes("left-back")) return "LB";
  if (value.includes("right-back")) return "RB";
  if (value.includes("defensive mid")) return "CDM";
  if (value.includes("attacking mid")) return "CAM";
  if (value.includes("left winger") || value.includes("left mid")) return "LW";
  if (value.includes("right winger") || value.includes("right mid")) return "RW";
  if (value.includes("centre-forward") || value.includes("center-forward") || value.includes("striker"))
    return "ST";
  if (value.includes("midfield")) return "CM";
  return "CM";
}

/** Upsert player media/market fields from Transfermarkt into Supabase. */
export async function upsertPlayerFromTransfermarkt(
  dbPlayerId: string,
  profile: TransfermarktPlayerProfile
): Promise<void> {
  if (!canUseDatabase()) return;

  const tmId = Number(profile.id);
  const photoUrl = resolvePlayerPhotoUrl({
    externalPhoto: profile.imageUrl,
    apiSportsId: null,
    photoUrl: profile.imageUrl ?? transfermarktPlayerPhotoUrl(tmId),
  });

  await getPrisma().player.update({
    where: { id: dbPlayerId },
    data: {
      transfermarktId: tmId,
      photoUrl,
      marketValue: profile.marketValue ?? undefined,
      height: profile.height && profile.height > 0 ? Math.round(profile.height) : undefined,
      nationality: profile.citizenship?.[0] ?? undefined,
      position: profile.position?.main ? mapPosition(profile.position.main) : undefined,
      dataSyncedAt: new Date(),
      dataSyncedSeason: CURRENT_SEASON,
    },
  });
}

/** Upsert club crest, stadium and metadata from Transfermarkt into Supabase. */
export async function upsertClubFromTransfermarkt(
  dbTeamId: string,
  profile: TransfermarktClubProfile
): Promise<void> {
  if (!canUseDatabase()) return;

  const tmId = Number(profile.id);
  const crestUrl =
    profile.image?.replace("/big/", "/head/").replace("//images", "/images") ??
    transfermarktCrestUrl(tmId);

  await getPrisma().team.update({
    where: { id: dbTeamId },
    data: {
      transfermarktId: tmId,
      crestUrl,
      stadium: profile.stadiumName ?? undefined,
      foundedYear: parseFoundedYear(profile.foundedOn),
      dataSyncedAt: new Date(),
      dataSyncedSeason: CURRENT_SEASON,
    },
  });
}

async function syncSquadPlayers(
  dbTeamId: string,
  squad: TransfermarktSquadPlayer[]
): Promise<void> {
  if (!canUseDatabase() || squad.length === 0) return;

  const prisma = getPrisma();
  const dbPlayers = await prisma.player.findMany({ where: { teamId: dbTeamId } });

  for (const tmPlayer of squad) {
    const match = dbPlayers.find(
      (player) =>
        namesLikelyMatch(player.fullName, tmPlayer.name) ||
        namesLikelyMatch(player.knownAs, tmPlayer.name)
    );
    if (!match) continue;

    const photoUrl = transfermarktPlayerPhotoUrl(Number(tmPlayer.id));
    await prisma.player.update({
      where: { id: match.id },
      data: {
        transfermarktId: Number(tmPlayer.id),
        photoUrl: resolvePlayerPhotoUrl({ photoUrl, externalPhoto: photoUrl }),
        marketValue: tmPlayer.marketValue ?? match.marketValue,
        height: tmPlayer.height && tmPlayer.height > 0 ? Math.round(tmPlayer.height) : match.height,
        nationality: tmPlayer.nationality?.[0] ?? match.nationality,
        position: tmPlayer.position ? mapPosition(tmPlayer.position) : match.position,
        dataSyncedAt: new Date(),
        dataSyncedSeason: CURRENT_SEASON,
      },
    });
  }
}

/** Ensure player has fresh Transfermarkt data; falls back to existing DB row on API failure. */
export async function ensurePlayerPersisted(player: DbPlayer): Promise<void> {
  if (!canUseDatabase()) return;

  const currentSeasonLabel =
    player.statistics?.find((s) => s.season === CURRENT_SEASON)?.season ??
    player.dataSyncedSeason;

  if (
    !needsPlayerSync({
      photoUrl: player.photoUrl,
      marketValue: player.marketValue,
      dataSyncedAt: player.dataSyncedAt,
      dataSyncedSeason: player.dataSyncedSeason,
      competitionName: player.team?.competition?.name,
      currentSeasonLabel,
    })
  ) {
    return;
  }

  try {
    let tmId = player.transfermarktId;
    if (!tmId) {
      tmId =
        (await searchTransfermarktPlayer(
          player.knownAs || player.fullName,
          player.team?.name
        )) ?? null;
    }
    if (!tmId) return;

    const profile = await fetchPlayerProfile(tmId);
    if (!profile) return;

    await upsertPlayerFromTransfermarkt(player.id, profile);
  } catch (error) {
    console.warn("[club-repo] Transfermarkt player sync failed — using DB cache:", player.id, error);
  }
}

/** Ensure club + squad + ESPN matches are persisted; graceful fallback to Supabase cache. */
export async function ensureClubPersisted(team: DbTeam): Promise<void> {
  if (!canUseDatabase()) return;

  const prisma = getPrisma();
  const currentTeamStat = team.statistics?.find((s) => s.season === CURRENT_SEASON);
  const latestMatch = await prisma.match.findFirst({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    orderBy: { matchDate: "desc" },
    select: { seasonLabel: true, updatedAt: true },
  });

  const shouldSyncTeam = needsTeamSync({
    crestUrl: team.crestUrl,
    stadium: team.stadium,
    dataSyncedAt: team.dataSyncedAt,
    dataSyncedSeason: team.dataSyncedSeason,
    competitionName: team.competition?.name,
    currentSeasonLabel: currentTeamStat?.season ?? team.dataSyncedSeason,
  });

  const shouldSyncMatches = needsMatchSync(
    latestMatch?.seasonLabel,
    team.competition?.name,
    latestMatch?.updatedAt
  );

  try {
    if (shouldSyncTeam) {
      let tmId = resolveTransfermarktClubId(team.name, team.transfermarktId);
      if (!tmId) {
        tmId = await searchTransfermarktClub(team.name);
      }
      if (tmId) {
        const { profile, squad } = await syncClub(tmId, team.competition?.name);
        if (profile) {
          await upsertClubFromTransfermarkt(team.id, profile);
        }
        await syncSquadPlayers(team.id, squad);
      }
    }

    if (shouldSyncMatches) {
      await syncEspnMatchesForCompetition(team.competition?.name);
    }
  } catch (error) {
    console.warn("[club-repo] External sync failed — using DB cache:", team.id, error);
  }
}

/** Upsert team season statistics from live standings into Supabase. */
export async function upsertTeamSeasonStats(
  teamId: string,
  stats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  }
): Promise<void> {
  if (!canUseDatabase()) return;

  await getPrisma().teamStatistic.upsert({
    where: { teamId_season: { teamId, season: CURRENT_SEASON } },
    create: {
      teamId,
      season: CURRENT_SEASON,
      matchesPlayed: stats.matchesPlayed,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      xG: stats.goalsFor,
      xGA: stats.goalsAgainst,
      possessionPct: 0,
      passAccuracyPct: 0,
      pressuresPer90: 0,
      attackRating: Math.min(99, Math.round(stats.goalsFor * 1.1)),
      defenseRating: Math.min(99, Math.max(0, 100 - stats.goalsAgainst)),
    },
    update: {
      matchesPlayed: stats.matchesPlayed,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      xG: stats.goalsFor,
      xGA: stats.goalsAgainst,
      attackRating: Math.min(99, Math.round(stats.goalsFor * 1.1)),
      defenseRating: Math.min(99, Math.max(0, 100 - stats.goalsAgainst)),
    },
  });
}

export const clubRepository = {
  upsertPlayerFromTransfermarkt,
  upsertClubFromTransfermarkt,
  upsertTeamSeasonStats,
  ensurePlayerPersisted,
  ensureClubPersisted,
};
