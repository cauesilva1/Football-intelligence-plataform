import type { Prisma, PrismaClient } from "@prisma/client";
import {
  fetchNhlClubStats,
  fetchNhlPlayByPlayShots,
  fetchNhlRoster,
  fetchNhlScheduleWindow,
  fetchNhlStandings,
  type NhlGoalieLine,
  type NhlRosterPlayer,
  type NhlSkaterLine,
} from "@/lib/api/nhl";
import { compactHockeySeason, hockeyRating, nhlApiSeasonId } from "@/lib/hockey/season";
import { getPrisma } from "@/lib/prisma";

const PROGRESS_KEY = "nhl:sync-progress";
const SPORT = "HOCKEY";
const LEAGUE = "NHL";

export interface NhlSyncOptions {
  now?: Date;
  maxTeams?: number;
  maxShotGames?: number;
  prisma?: PrismaClient;
  log?: (message: string) => void;
}

export interface NhlSyncResult {
  season: number;
  teams: number;
  matches: number;
  teamsSynced: number;
  teamsDeferred: number;
  players: number;
  shotGames: number;
  shots: number;
  skippedShots: number;
}

interface Progress {
  teamIndex: number;
  shotGameIds: string[];
}

function logDefault(message: string) {
  console.log(`[NHL-CRON] ${message}`);
}

async function readProgress(prisma: PrismaClient): Promise<Progress> {
  const row = await prisma.systemCache.findUnique({ where: { key: PROGRESS_KEY } });
  const json = row?.json;
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { teamIndex: 0, shotGameIds: [] };
  }
  const record = json as { teamIndex?: unknown; shotGameIds?: unknown };
  return {
    teamIndex: typeof record.teamIndex === "number" ? record.teamIndex : 0,
    shotGameIds: Array.isArray(record.shotGameIds) ? record.shotGameIds.filter((id) => typeof id === "string") : [],
  };
}

async function writeProgress(prisma: PrismaClient, progress: Progress) {
  const json = progress as unknown as Prisma.InputJsonValue;
  await prisma.systemCache.upsert({
    where: { key: PROGRESS_KEY },
    create: { key: PROGRESS_KEY, json },
    update: { json },
  });
}

export async function ensureNhlCompetition(prisma: PrismaClient) {
  const existing = await prisma.competition.findFirst({
    where: { OR: [{ name: "NHL" }, { espnSlug: "nhl" }] },
  });
  if (existing) return existing;
  return prisma.competition.create({
    data: { name: "NHL", country: "USA", tier: 1, espnSlug: "nhl" },
  });
}

function hockeyPosition(code: string): string {
  if (code === "R") return "RW";
  if (code === "L") return "LW";
  return code || "F";
}

function preferredFoot(shoots: "L" | "R"): "LEFT" | "RIGHT" {
  return shoots === "L" ? "LEFT" : "RIGHT";
}

async function upsertPlayer(
  prisma: PrismaClient,
  teamId: string,
  roster: NhlRosterPlayer | undefined,
  line: { playerId: number; firstName: string; lastName: string; position: string; headshot?: string },
  stats: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    points: number;
    plusMinus: number;
    penaltyMinutes: number;
    shots: number;
    timeOnIceSeconds: number;
    saves: number;
    shotsAgainst: number;
    savePercentage: number;
    goalsAgainst: number;
  },
  season: number
) {
  const fullName = `${line.firstName} ${line.lastName}`.trim();
  if (!fullName) return null;
  const birth = roster?.birthDate ? new Date(roster.birthDate) : new Date("1995-01-01T00:00:00Z");
  const rating = hockeyRating({
    position: hockeyPosition(line.position),
    gamesPlayed: stats.gamesPlayed,
    points: stats.points,
    savePercentage: stats.savePercentage,
  });
  const data = {
    fullName,
    knownAs: line.lastName || fullName,
    dateOfBirth: birth,
    nationality: roster?.birthCountry || "Unlisted",
    position: hockeyPosition(line.position),
    height: roster?.heightCm || 180,
    weight: roster?.weightKg || 80,
    preferredFoot: preferredFoot(roster?.shoots ?? "R"),
    photoUrl: line.headshot ?? roster?.headshot,
    apiSportsId: line.playerId,
    sport: SPORT,
    league: LEAGUE,
    teamId,
    dataSyncedAt: new Date(),
    dataSyncedSeason: String(season),
  };
  const existing = await prisma.player.findFirst({
    where: { sport: SPORT, apiSportsId: line.playerId },
  });
  const player = existing
    ? await prisma.player.update({ where: { id: existing.id }, data })
    : await prisma.player.create({ data });

  await prisma.playerSeasonStats.upsert({
    where: { playerId_season: { playerId: player.id, season } },
    create: {
      playerId: player.id,
      season,
      goals: stats.goals,
      assists: stats.assists,
      points: stats.points,
      matchesPlayed: stats.gamesPlayed,
      minutesPlayed: Math.round(stats.timeOnIceSeconds / 60),
      plusMinus: stats.plusMinus,
      penaltyMinutes: stats.penaltyMinutes,
      timeOnIceSeconds: stats.timeOnIceSeconds,
      saves: stats.saves,
      shotsAgainst: stats.shotsAgainst,
      savePercentage: stats.savePercentage,
      goalsAgainst: stats.goalsAgainst,
    },
    update: {
      goals: stats.goals,
      assists: stats.assists,
      points: stats.points,
      matchesPlayed: stats.gamesPlayed,
      minutesPlayed: Math.round(stats.timeOnIceSeconds / 60),
      plusMinus: stats.plusMinus,
      penaltyMinutes: stats.penaltyMinutes,
      timeOnIceSeconds: stats.timeOnIceSeconds,
      saves: stats.saves,
      shotsAgainst: stats.shotsAgainst,
      savePercentage: stats.savePercentage,
      goalsAgainst: stats.goalsAgainst,
    },
  });

  const externalKey = `nhl:${player.id}:${season}`;
  await prisma.playerStatistic.upsert({
    where: { externalKey },
    create: {
      externalKey,
      playerId: player.id,
      teamId,
      season: String(season),
      appearances: stats.gamesPlayed,
      minutesPlayed: Math.round(stats.timeOnIceSeconds / 60),
      goals: stats.goals,
      assists: stats.assists,
      shots: stats.shots,
      rating,
    },
    update: {
      teamId,
      appearances: stats.gamesPlayed,
      minutesPlayed: Math.round(stats.timeOnIceSeconds / 60),
      goals: stats.goals,
      assists: stats.assists,
      shots: stats.shots,
      rating,
    },
  });

  return player.id;
}

function skaterStats(line: NhlSkaterLine) {
  return {
    gamesPlayed: line.gamesPlayed,
    goals: line.goals,
    assists: line.assists,
    points: line.points,
    plusMinus: line.plusMinus,
    penaltyMinutes: line.penaltyMinutes,
    shots: line.shots,
    timeOnIceSeconds: line.timeOnIceSeconds,
    saves: 0,
    shotsAgainst: 0,
    savePercentage: 0,
    goalsAgainst: 0,
  };
}

function goalieStats(line: NhlGoalieLine) {
  return {
    gamesPlayed: line.gamesPlayed,
    goals: 0,
    assists: 0,
    points: 0,
    plusMinus: 0,
    penaltyMinutes: line.penaltyMinutes,
    shots: 0,
    timeOnIceSeconds: line.timeOnIceSeconds,
    saves: line.saves,
    shotsAgainst: line.shotsAgainst,
    savePercentage: line.savePercentage,
    goalsAgainst: line.goalsAgainst,
  };
}

export async function runNhlSync(options: NhlSyncOptions = {}): Promise<NhlSyncResult> {
  const prisma = options.prisma ?? getPrisma();
  const log = options.log ?? logDefault;
  const now = options.now ?? new Date();
  const maxTeams = options.maxTeams ?? 4;
  const maxShotGames = options.maxShotGames ?? 2;
  const apiSeason = nhlApiSeasonId(now);
  const season = compactHockeySeason(apiSeason);
  const anchor = now.toISOString().slice(0, 10);

  const competition = await ensureNhlCompetition(prisma);
  const standings = await fetchNhlStandings();
  const teamIds = new Map<string, string>();

  for (const row of standings) {
    const existing = await prisma.team.findFirst({
      where: { competitionId: competition.id, shortName: row.abbrev },
    });
    const team = existing
      ? await prisma.team.update({
          where: { id: existing.id },
          data: { name: row.name, country: row.conference || "USA" },
        })
      : await prisma.team.create({
          data: {
            name: row.name,
            shortName: row.abbrev,
            country: row.conference || "USA",
            competitionId: competition.id,
          },
        });
    teamIds.set(row.abbrev, team.id);
  }
  log(`standings: ${standings.length} clubs`);

  const games = await fetchNhlScheduleWindow(anchor);
  const recentCutoff = new Date(now);
  recentCutoff.setUTCDate(recentCutoff.getUTCDate() - 14);
  const recentGames = games.filter((game) => game.startTime && new Date(game.startTime) >= recentCutoff);
  const olderGames = games.filter((game) => game.startTime && new Date(game.startTime) < recentCutoff);
  const olderKeys = olderGames.map((game) => `nhl:${game.id}`);
  const storedOlder = olderKeys.length
    ? await prisma.match.findMany({
        where: { externalKey: { in: olderKeys } },
        select: { externalKey: true },
      })
    : [];
  const storedOlderKeys = new Set(storedOlder.map((row) => row.externalKey));
  const olderCatchup = olderGames.filter((game) => !storedOlderKeys.has(`nhl:${game.id}`)).slice(0, 40);
  const gamesToWrite = [...recentGames, ...olderCatchup];
  let matches = 0;
  for (const game of gamesToWrite) {
    const homeId = teamIds.get(game.homeAbbrev);
    const awayId = teamIds.get(game.awayAbbrev);
    if (!homeId || !awayId || !game.startTime) continue;
    const externalKey = `nhl:${game.id}`;
    await prisma.match.upsert({
      where: { externalKey },
      create: {
        externalKey,
        competitionId: competition.id,
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore: game.homeScore ?? 0,
        awayScore: game.awayScore ?? 0,
        matchDate: new Date(game.startTime),
        status: game.status,
        seasonLabel: String(season),
        source: "nhl",
      },
      update: {
        homeScore: game.homeScore ?? 0,
        awayScore: game.awayScore ?? 0,
        status: game.status,
        matchDate: new Date(game.startTime),
      },
    });
    matches += 1;
  }
  log(`schedule: ${matches} games (${games.filter((game) => game.status === "final").length} final)`);

  const progress = await readProgress(prisma);
  const abbrevs = standings.map((row) => row.abbrev);
  const start = abbrevs.length ? progress.teamIndex % abbrevs.length : 0;
  const selected = abbrevs.slice(start, start + maxTeams);
  const wrapped = selected.length < maxTeams ? abbrevs.slice(0, maxTeams - selected.length) : [];
  const batch = [...selected, ...wrapped];
  let players = 0;

  for (const abbrev of batch) {
    const teamId = teamIds.get(abbrev);
    if (!teamId) continue;
    const [roster, lines] = await Promise.all([
      fetchNhlRoster(abbrev, apiSeason),
      fetchNhlClubStats(abbrev, apiSeason),
    ]);
    const rosterById = new Map(roster.map((player) => [player.id, player]));
    log(`${abbrev}: roster ${roster.length}, skaters ${lines.skaters.length}, goalies ${lines.goalies.length}`);
    for (const skater of lines.skaters) {
      if (skater.gamesPlayed <= 0 && skater.points <= 0) continue;
      const id = await upsertPlayer(prisma, teamId, rosterById.get(skater.playerId), skater, skaterStats(skater), season);
      if (id) players += 1;
    }
    for (const goalie of lines.goalies) {
      if (goalie.gamesPlayed <= 0 && goalie.saves <= 0) continue;
      const id = await upsertPlayer(
        prisma,
        teamId,
        rosterById.get(goalie.playerId),
        { ...goalie, position: "G" },
        goalieStats(goalie),
        season
      );
      if (id) players += 1;
    }
  }

  const nextIndex = abbrevs.length ? (start + batch.length) % abbrevs.length : 0;
  const clubsWithPlayers = await prisma.team.findMany({
    where: { competitionId: competition.id, players: { some: { sport: SPORT } } },
    select: { shortName: true },
  });
  const shotTeams = new Set(batch.length ? batch : clubsWithPlayers.map((team) => team.shortName));
  const doneShots = new Set(progress.shotGameIds);
  const pending = games
    .filter(
      (game) =>
        game.status === "final" &&
        !doneShots.has(String(game.id)) &&
        (shotTeams.has(game.homeAbbrev) || shotTeams.has(game.awayAbbrev))
    )
    .slice(0, maxShotGames)
    .map((game) => String(game.id));
  let shots = 0;
  let skippedShots = 0;

  for (const gameId of pending) {
    const events = await fetchNhlPlayByPlayShots(gameId);
    let written = 0;
    for (const event of events) {
      const player = await prisma.player.findFirst({
        where: { sport: SPORT, apiSportsId: event.playerId },
        select: { id: true },
      });
      if (!player) {
        skippedShots += 1;
        continue;
      }
      await prisma.hockeyShot.upsert({
        where: { gameId_externalPlayId: { gameId: event.gameId, externalPlayId: event.externalPlayId } },
        create: {
          playerId: player.id,
          gameId: event.gameId,
          externalPlayId: event.externalPlayId,
          x: event.x,
          y: event.y,
          made: event.made,
          shotType: event.shotType,
          season,
        },
        update: {
          playerId: player.id,
          x: event.x,
          y: event.y,
          made: event.made,
          shotType: event.shotType,
        },
      });
      written += 1;
    }
    shots += written;
    doneShots.add(gameId);
    log(`play-by-play ${gameId}: ${written} shots stored, ${events.length} with coordinates`);
  }

  await writeProgress(prisma, {
    teamIndex: nextIndex,
    shotGameIds: [...doneShots].slice(-400),
  });
  log(`progress teamIndex=${nextIndex} players=${players} shots=${shots}`);

  return {
    season,
    teams: standings.length,
    matches,
    teamsSynced: batch.length,
    teamsDeferred: Math.max(0, abbrevs.length - batch.length),
    players,
    shotGames: pending.length,
    shots,
    skippedShots,
  };
}
