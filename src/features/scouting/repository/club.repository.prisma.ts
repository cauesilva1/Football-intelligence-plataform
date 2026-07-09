import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { CURRENT_SEASON } from "@/lib/seasons";
import { syncEspnMatchesForCompetition } from "@/lib/api/espn-matches";
import {
  buildFbrefExternalKey,
  estimateRatingFromFbref,
  findFbrefPlayerRecord,
} from "@/lib/api/csv-parser";
import type { TransformedRecord } from "@/etl/transform/transformer";
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

function currentSeasonStat(player: DbPlayer) {
  return (
    player.statistics?.find((s) => s.season === CURRENT_SEASON) ?? player.statistics?.[0] ?? null
  );
}

function hasMeaningfulSeasonStats(player: DbPlayer): boolean {
  const stat = currentSeasonStat(player);
  if (!stat) return false;
  if (stat.minutesPlayed <= 0) return true;
  return (
    stat.tacklesWon > 0 ||
    stat.interceptions > 0 ||
    stat.goals > 0 ||
    stat.assists > 0 ||
    stat.passAccuracy > 0 ||
    stat.keyPasses > 0
  );
}

/** Proxy pass accuracy when the light FBref CSV has no dedicated column. */
function estimatePassAccuracyFromFbref(fbref: TransformedRecord["statistic"]): number {
  const passAccuracy = fbref.passAccuracy ?? 0;
  if (passAccuracy > 0) return passAccuracy;
  if ((fbref.shots ?? 0) > 0) {
    const shotPct = ((fbref.shotsOnTarget ?? 0) / (fbref.shots ?? 1)) * 100;
    return Number(Math.min(92, Math.max(68, 70 + shotPct * 0.22)).toFixed(1));
  }
  return 0;
}

/** Merge Transfermarkt profile fields with FBref advanced stats into Supabase. */
export async function upsertPlayerHybrid(
  player: DbPlayer,
  tmProfile: TransfermarktPlayerProfile | null,
  fbref: TransformedRecord | null
): Promise<void> {
  if (!canUseDatabase()) return;

  const prisma = getPrisma();
  const tmId = tmProfile ? Number(tmProfile.id) : player.transfermarktId;
  const photoUrl = tmProfile
    ? resolvePlayerPhotoUrl({
        externalPhoto: tmProfile.imageUrl,
        apiSportsId: player.apiSportsId,
        photoUrl: tmProfile.imageUrl ?? transfermarktPlayerPhotoUrl(tmId ?? 0),
      })
    : player.photoUrl;

  await prisma.player.upsert({
    where: { id: player.id },
    create: {
      id: player.id,
      fullName: player.fullName,
      knownAs: player.knownAs,
      dateOfBirth: player.dateOfBirth,
      nationality: tmProfile?.citizenship?.[0] ?? player.nationality,
      position: tmProfile?.position?.main
        ? mapPosition(tmProfile.position.main)
        : player.position,
      height:
        tmProfile?.height && tmProfile.height > 0
          ? Math.round(tmProfile.height)
          : player.height,
      weight: player.weight,
      marketValue: tmProfile?.marketValue ?? player.marketValue,
      photoUrl,
      transfermarktId: tmId ?? undefined,
      teamId: player.teamId ?? undefined,
      strengths: player.strengths,
      weaknesses: player.weaknesses,
      dataSyncedAt: new Date(),
      dataSyncedSeason: CURRENT_SEASON,
    },
    update: {
      transfermarktId: tmId ?? undefined,
      photoUrl,
      marketValue: tmProfile?.marketValue ?? undefined,
      height:
        tmProfile?.height && tmProfile.height > 0
          ? Math.round(tmProfile.height)
          : undefined,
      nationality: tmProfile?.citizenship?.[0] ?? undefined,
      position: tmProfile?.position?.main
        ? mapPosition(tmProfile.position.main)
        : undefined,
      dataSyncedAt: new Date(),
      dataSyncedSeason: CURRENT_SEASON,
    },
  });

  if (!fbref || !player.teamId) return;

  const { statistic } = fbref;
  const minutes = statistic.minutesPlayed ?? 0;
  const baseRating = statistic.rating ?? 0;
  const rating = baseRating > 0 ? baseRating : estimateRatingFromFbref(statistic, minutes);
  const passAccuracy = estimatePassAccuracyFromFbref(statistic);
  const externalKey =
    fbref.externalKey ??
    buildFbrefExternalKey(player.fullName, player.team?.name ?? fbref.source.squad, CURRENT_SEASON);

  const statPayload = {
    appearances: statistic.appearances ?? 0,
    minutesPlayed: minutes,
    goals: statistic.goals ?? 0,
    assists: statistic.assists ?? 0,
    xG: statistic.xG ?? 0,
    xA: statistic.xA ?? 0,
    shots: statistic.shots ?? 0,
    shotsOnTarget: statistic.shotsOnTarget ?? 0,
    passes: statistic.passes ?? 0,
    passAccuracy,
    keyPasses: statistic.keyPasses ?? 0,
    dribblesCompleted: statistic.dribblesCompleted ?? 0,
    tacklesWon: statistic.tacklesWon ?? 0,
    interceptions: statistic.interceptions ?? 0,
    duelsWonPct: statistic.duelsWonPct ?? 0,
    yellowCards: statistic.yellowCards ?? 0,
    redCards: statistic.redCards ?? 0,
    rating,
  };

  await prisma.playerStatistic.upsert({
    where: {
      playerId_teamId_season: {
        playerId: player.id,
        teamId: player.teamId,
        season: CURRENT_SEASON,
      },
    },
    create: {
      externalKey,
      playerId: player.id,
      teamId: player.teamId,
      season: CURRENT_SEASON,
      ...statPayload,
    },
    update: statPayload,
  });
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

/** Ensure player has fresh Transfermarkt + FBref data; falls back to DB cache on API failure. */
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
      hasMeaningfulStats: hasMeaningfulSeasonStats(player),
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

    const [profile, fbref] = await Promise.all([
      tmId ? fetchPlayerProfile(tmId) : Promise.resolve(null),
      findFbrefPlayerRecord(
        player.fullName,
        player.knownAs,
        player.team?.name,
        player.team?.competition?.name
      ),
    ]);

    if (!profile && !fbref) return;

    await upsertPlayerHybrid(player, profile, fbref);
  } catch (error) {
    console.warn("[club-repo] Hybrid player sync failed — using DB cache:", player.id, error);
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
    select: { seasonLabel: true, updatedAt: true, status: true, matchDate: true, homeScore: true, awayScore: true },
  });

  const staleScheduled = await prisma.match.findFirst({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      status: { not: "finished" },
      matchDate: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    select: { id: true },
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
    latestMatch?.updatedAt,
    Boolean(staleScheduled)
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
  upsertPlayerHybrid,
  upsertClubFromTransfermarkt,
  upsertTeamSeasonStats,
  ensurePlayerPersisted,
  ensureClubPersisted,
};
