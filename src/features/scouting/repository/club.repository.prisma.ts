import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { BRAZIL_SEASON_LABEL, CURRENT_SEASON, resolvePersistedSeasonLabel } from "@/lib/seasons";
import {
  resolveSeasonYearFromLabel,
  upsertPlayerSeasonStats,
} from "@/lib/metrics/upsert-player-season-stats";
import { syncEspnMatchesForCompetition } from "@/lib/api/espn-matches";
import { fetchEspnClubRoster, type EspnRosterPlayer } from "@/lib/api/espn-roster";
import { findFbrefPlayerRecord } from "@/lib/api/csv-parser";
import type { TransformedRecord } from "@/etl/transform/transformer";
import {
  fetchPlayerProfile,
  isTransfermarktAvailable,
  parseFoundedYear,
  resolveTransfermarktClubId,
  searchTransfermarktClub,
  searchTransfermarktPlayer,
  syncClub,
  transfermarktCrestUrl,
  transfermarktPlayerPhotoUrl,
  isBrazilianLeague,
  type TransfermarktClubProfile,
  type TransfermarktPlayerProfile,
  type TransfermarktSquadPlayer,
} from "@/lib/api/transfermarkt";
import { namesLikelyMatch, needsMatchSync, needsPlayerSync, needsTeamSync } from "@/lib/sync/data-staleness";
import { resolvePlayerPhotoUrl } from "@/lib/player-media";
import { isBasketballCompetition } from "@/lib/sport";

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
  const passAccuracy = estimatePassAccuracyFromFbref(statistic);

  const seasonLabel = isBrazilianLeague(player.team?.competition?.name)
    ? BRAZIL_SEASON_LABEL
    : CURRENT_SEASON;
  const seasonYear = resolveSeasonYearFromLabel(seasonLabel);

  await upsertPlayerSeasonStats(getPrisma(), player.id, seasonYear, {
    goals: statistic.goals ?? 0,
    assists: statistic.assists ?? 0,
    tackles: statistic.tacklesWon ?? 0,
    interceptions: statistic.interceptions ?? 0,
    passingAccuracy: passAccuracy,
    minutesPlayed: minutes,
    matchesPlayed: statistic.appearances ?? 0,
  });

  await getPrisma().player.update({
    where: { id: player.id },
    data: {
      dataSyncedSeason: String(seasonYear),
      dataSyncedAt: new Date(),
    },
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
  profile: TransfermarktClubProfile,
  competitionName?: string | null
): Promise<void> {
  if (!canUseDatabase()) return;

  const tmId = Number(profile.id);
  const crestUrl =
    profile.image?.replace("/big/", "/head/").replace("//images", "/images") ??
    transfermarktCrestUrl(tmId);
  const syncedSeason = isBrazilianLeague(competitionName)
    ? BRAZIL_SEASON_LABEL
    : CURRENT_SEASON;

  await getPrisma().team.update({
    where: { id: dbTeamId },
    data: {
      transfermarktId: tmId,
      crestUrl,
      stadium: profile.stadiumName ?? undefined,
      foundedYear: parseFoundedYear(profile.foundedOn),
      dataSyncedAt: new Date(),
      dataSyncedSeason: syncedSeason,
    },
  });
}

function parseSquadDateOfBirth(raw?: string): Date {
  if (!raw?.trim()) return new Date(Date.UTC(2000, 0, 1));
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date(Date.UTC(2000, 0, 1)) : parsed;
}

/** Create or update squad players from Transfermarkt (including empty Brazilian rosters). */
export async function persistSquadFromTransfermarkt(
  dbTeamId: string,
  squad: TransfermarktSquadPlayer[],
  competitionName?: string | null
): Promise<void> {
  if (!canUseDatabase() || squad.length === 0) return;

  const prisma = getPrisma();
  const seasonLabel = resolvePersistedSeasonLabel(competitionName);
  const dbPlayers = await prisma.player.findMany({ where: { teamId: dbTeamId } });

  for (const tmPlayer of squad) {
    const tmId = Number(tmPlayer.id);
    if (!Number.isFinite(tmId)) continue;

    const photoUrl = transfermarktPlayerPhotoUrl(tmId);
    const knownAs = tmPlayer.name.split(" ").pop() ?? tmPlayer.name;
    const position = tmPlayer.position ? mapPosition(tmPlayer.position) : "CM";
    const nationality = tmPlayer.nationality?.[0] ?? "UNK";
    const height = tmPlayer.height && tmPlayer.height > 0 ? Math.round(tmPlayer.height) : 180;

    const existing =
      dbPlayers.find(
        (player) =>
          player.transfermarktId === tmId ||
          namesLikelyMatch(player.fullName, tmPlayer.name) ||
          namesLikelyMatch(player.knownAs, tmPlayer.name)
      ) ??
      (await prisma.player.findFirst({ where: { transfermarktId: tmId } }));

    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: {
          teamId: dbTeamId,
          transfermarktId: tmId,
          photoUrl: resolvePlayerPhotoUrl({ photoUrl, externalPhoto: photoUrl }),
          marketValue: tmPlayer.marketValue ?? existing.marketValue,
          height,
          nationality,
          position,
          dataSyncedAt: new Date(),
          dataSyncedSeason: seasonLabel,
        },
      });
      continue;
    }

    await prisma.player.create({
      data: {
        fullName: tmPlayer.name,
        knownAs,
        dateOfBirth: parseSquadDateOfBirth(tmPlayer.dateOfBirth),
        nationality,
        position,
        height,
        weight: 75,
        marketValue: tmPlayer.marketValue ?? 0,
        photoUrl: resolvePlayerPhotoUrl({ photoUrl, externalPhoto: photoUrl }),
        transfermarktId: tmId,
        teamId: dbTeamId,
        strengths: [],
        weaknesses: [],
        dataSyncedAt: new Date(),
        dataSyncedSeason: seasonLabel,
      },
    });
  }
}

/** Persist roster from ESPN when Transfermarkt is down or empty. */
export async function persistSquadFromEspn(
  dbTeamId: string,
  squad: EspnRosterPlayer[],
  competitionName?: string | null
): Promise<number> {
  if (!canUseDatabase() || squad.length === 0) return 0;

  const prisma = getPrisma();
  const seasonLabel = resolvePersistedSeasonLabel(competitionName);
  const seasonYear = resolveSeasonYearFromLabel(seasonLabel);
  const dbPlayers = await prisma.player.findMany({ where: { teamId: dbTeamId } });
  let saved = 0;

  for (const athlete of squad) {
    const knownAs = athlete.fullName.split(" ").pop() ?? athlete.fullName;
    const existing = dbPlayers.find(
      (player) =>
        namesLikelyMatch(player.fullName, athlete.fullName) ||
        namesLikelyMatch(player.knownAs, athlete.fullName)
    );

    let playerId: string;

    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: {
          teamId: dbTeamId,
          photoUrl: resolvePlayerPhotoUrl({
            photoUrl: athlete.photoUrl ?? existing.photoUrl,
            externalPhoto: athlete.photoUrl,
          }),
          nationality:
            athlete.nationality !== "UNK" ? athlete.nationality : existing.nationality,
          position: athlete.position || existing.position,
          dataSyncedAt: new Date(),
          dataSyncedSeason: seasonLabel,
        },
      });
      playerId = existing.id;
      saved += 1;
    } else {
      const created = await prisma.player.create({
        data: {
          fullName: athlete.fullName,
          knownAs,
          dateOfBirth: parseSquadDateOfBirth(athlete.dateOfBirth),
          nationality: athlete.nationality || "UNK",
          position: athlete.position || "CM",
          height: 180,
          weight: 75,
          marketValue: 0,
          photoUrl: resolvePlayerPhotoUrl({
            photoUrl: athlete.photoUrl,
            externalPhoto: athlete.photoUrl,
          }),
          teamId: dbTeamId,
          strengths: [],
          weaknesses: [],
          dataSyncedAt: new Date(),
          dataSyncedSeason: seasonLabel,
          league: competitionName ?? "Soccer",
        },
      });
      playerId = created.id;
      saved += 1;
    }

    const season = athlete.seasonStats;
    if (season && (season.appearances > 0 || season.goals > 0 || season.assists > 0)) {
      await upsertPlayerSeasonStats(prisma, playerId, seasonYear, {
        goals: season.goals,
        assists: season.assists,
        tackles: 0,
        interceptions: 0,
        passingAccuracy: 0,
        minutesPlayed: season.minutesPlayed,
        matchesPlayed: season.appearances,
      });
    }
  }

  return saved;
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
    const tmOk = isTransfermarktAvailable();
    let tmId = tmOk ? player.transfermarktId : null;
    if (tmOk && !tmId) {
      tmId =
        (await searchTransfermarktPlayer(
          player.knownAs || player.fullName,
          player.team?.name
        )) ?? null;
    }

    const [profile, fbref] = await Promise.all([
      tmOk && tmId ? fetchPlayerProfile(tmId) : Promise.resolve(null),
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
  const currentTeamStat =
    team.statistics?.find((s) => s.season === resolvePersistedSeasonLabel(team.competition?.name)) ??
    team.statistics?.find((s) => s.season === CURRENT_SEASON);
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

  const squadCount = await prisma.player.count({ where: { teamId: team.id } });
  const competitionName = team.competition?.name;
  const isBasketball = isBasketballCompetition(competitionName ?? "");
  const seasonLabel = resolvePersistedSeasonLabel(competitionName);
  const seasonYear = resolveSeasonYearFromLabel(seasonLabel);

  const playersWithSeasonStats = await prisma.player.count({
    where: {
      teamId: team.id,
      stats: {
        some: {
          season: seasonYear,
          OR: [{ matchesPlayed: { gt: 0 } }, { goals: { gt: 0 } }, { assists: { gt: 0 } }],
        },
      },
    },
  });

  const needsEspnStatsEnrichment =
    !isBasketball &&
    squadCount >= 8 &&
    playersWithSeasonStats < Math.max(3, Math.floor(squadCount * 0.25));

  const shouldSyncSquad = !isBasketball && (squadCount < 8 || needsEspnStatsEnrichment);

  try {
    if ((shouldSyncTeam || shouldSyncSquad) && !isBasketball) {
      let tmSquadSaved = false;
      const tmOk = isTransfermarktAvailable();

      if (tmOk && !needsEspnStatsEnrichment) {
        let tmId = resolveTransfermarktClubId(team.name, team.transfermarktId);
        if (!tmId) {
          tmId = await searchTransfermarktClub(team.name);
        }
        if (tmId) {
          const { profile, squad } = await syncClub(tmId, competitionName);
          if (profile) {
            await upsertClubFromTransfermarkt(team.id, profile, competitionName);
          }
          if (squad.length > 0) {
            await persistSquadFromTransfermarkt(team.id, squad, competitionName);
            tmSquadSaved = true;
          }
        }
      }

      if (shouldSyncSquad && (!tmSquadSaved || needsEspnStatsEnrichment)) {
        const espnSquad = await fetchEspnClubRoster(team.name, competitionName);
        if (espnSquad.length > 0) {
          const saved = await persistSquadFromEspn(team.id, espnSquad, competitionName);
          console.info(
            `[club-repo] ESPN roster synced for ${team.name}: ${saved} players` +
              (needsEspnStatsEnrichment ? " (stats enrichment)" : " (Transfermarkt unavailable)")
          );
        } else {
          console.warn(`[club-repo] No ESPN roster found for ${team.name} (${competitionName})`);
        }
      }
    }

    if (shouldSyncMatches && !isBasketball) {
      await syncEspnMatchesForCompetition(competitionName);
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
  },
  competitionName?: string | null
): Promise<void> {
  if (!canUseDatabase()) return;

  const { resolvePersistedSeasonLabel } = await import("@/lib/seasons");
  const season = resolvePersistedSeasonLabel(competitionName);

  await getPrisma().teamStatistic.upsert({
    where: { teamId_season: { teamId, season } },
    create: {
      teamId,
      season,
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
  persistSquadFromTransfermarkt,
  persistSquadFromEspn,
  upsertTeamSeasonStats,
  ensurePlayerPersisted,
  ensureClubPersisted,
};
