/**
 * Official NHL web API. Public, no key.
 * https://api-web.nhle.com/v1
 */

const NHL_API = "https://api-web.nhle.com/v1";

export const NHL_FETCH_HEADERS: HeadersInit = {
  Accept: "application/json",
  "User-Agent": "football-intelligence-platform/1.0 (nhl)",
};

export type NhlLocalized = { default?: string; fr?: string } | string | null | undefined;

export function nhlText(value: NhlLocalized): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return (value.default ?? "").trim();
}

export type NhlGameStatus = "scheduled" | "live" | "final";

export interface NhlScheduleGame {
  id: number;
  season: number;
  startTime: string;
  status: NhlGameStatus;
  statusLabel: string;
  awayAbbrev: string;
  awayName: string;
  awayLogo?: string;
  awayScore: number | null;
  homeAbbrev: string;
  homeName: string;
  homeLogo?: string;
  homeScore: number | null;
}

export interface NhlStandingRow {
  abbrev: string;
  name: string;
  conference: string;
  division: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface NhlSkaterLine {
  playerId: number;
  firstName: string;
  lastName: string;
  position: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes: number;
  shots: number;
  timeOnIceSeconds: number;
  headshot?: string;
}

export interface NhlGoalieLine {
  playerId: number;
  firstName: string;
  lastName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
  savePercentage: number;
  timeOnIceSeconds: number;
  penaltyMinutes: number;
  headshot?: string;
}

export interface NhlRosterPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  shoots: "L" | "R";
  birthDate?: string;
  heightCm: number;
  weightKg: number;
  birthCountry: string;
  headshot?: string;
}

export interface NhlShotEvent {
  gameId: string;
  externalPlayId: string;
  playerId: number;
  x: number;
  y: number;
  made: boolean;
  shotType: string;
}

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function optionalNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** NHL rink coordinates are about ±100 by ±42. Anything outside that is not a shot location. */
export function isPlausibleNhlCoordinate(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 100 && Math.abs(y) <= 43;
}

export function mapNhlGameState(gameState: string | undefined): NhlGameStatus {
  const state = (gameState ?? "").toUpperCase();
  if (state === "OFF" || state === "FINAL" || state === "OFFICIAL") return "final";
  if (state === "LIVE" || state === "CRIT" || state === "INPROGRESS") return "live";
  return "scheduled";
}

export function parseNhlSchedule(payload: unknown): {
  games: NhlScheduleGame[];
  previousStartDate: string | null;
  nextStartDate: string | null;
  regularSeasonStartDate: string | null;
} {
  const root = asRecord(payload);
  const games: NhlScheduleGame[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const row = asRecord(value);
    if (!row) return;
    if (typeof row.id === "number" && typeof row.gameState === "string" && row.awayTeam && row.homeTeam) {
      const away = asRecord(row.awayTeam) ?? {};
      const home = asRecord(row.homeTeam) ?? {};
      const status = mapNhlGameState(String(row.gameState));
      games.push({
        id: row.id,
        season: num(row.season),
        startTime: typeof row.startTimeUTC === "string" ? row.startTimeUTC : "",
        status,
        statusLabel: status === "final" ? "Final" : status === "live" ? "Live" : "Upcoming",
        awayAbbrev: nhlText(away.abbrev as NhlLocalized),
        awayName: nhlText((away.commonName ?? away.placeName) as NhlLocalized) || nhlText(away.abbrev as NhlLocalized),
        awayLogo: typeof away.logo === "string" ? away.logo : undefined,
        awayScore: status === "scheduled" ? null : optionalNum(away.score),
        homeAbbrev: nhlText(home.abbrev as NhlLocalized),
        homeName: nhlText((home.commonName ?? home.placeName) as NhlLocalized) || nhlText(home.abbrev as NhlLocalized),
        homeLogo: typeof home.logo === "string" ? home.logo : undefined,
        homeScore: status === "scheduled" ? null : optionalNum(home.score),
      });
      return;
    }
    Object.values(row).forEach(visit);
  };

  visit(root?.gameWeek);
  return {
    games,
    previousStartDate: typeof root?.previousStartDate === "string" ? root.previousStartDate : null,
    nextStartDate: typeof root?.nextStartDate === "string" ? root.nextStartDate : null,
    regularSeasonStartDate:
      typeof root?.regularSeasonStartDate === "string" ? root.regularSeasonStartDate : null,
  };
}

export function parseNhlStandings(payload: unknown): NhlStandingRow[] {
  const root = asRecord(payload);
  const rows = Array.isArray(root?.standings) ? root.standings : [];
  return rows.flatMap((row) => {
    const record = asRecord(row);
    if (!record) return [];
    const abbrev = nhlText(record.teamAbbrev as NhlLocalized);
    const name = nhlText(record.teamName as NhlLocalized);
    if (!abbrev || !name) return [];
    return [
      {
        abbrev,
        name,
        conference: nhlText(record.conferenceName as NhlLocalized),
        division: nhlText(record.divisionName as NhlLocalized),
        gamesPlayed: num(record.gamesPlayed),
        wins: num(record.wins),
        losses: num(record.losses),
        otLosses: num(record.otLosses),
        points: num(record.points),
        goalsFor: num(record.goalFor),
        goalsAgainst: num(record.goalAgainst),
      },
    ];
  });
}

function parseName(row: Json, key: "firstName" | "lastName"): string {
  return nhlText(row[key] as NhlLocalized);
}

export function parseNhlClubStats(payload: unknown): { skaters: NhlSkaterLine[]; goalies: NhlGoalieLine[] } {
  const root = asRecord(payload);
  const skaters = (Array.isArray(root?.skaters) ? root.skaters : []).flatMap((row) => {
    const record = asRecord(row);
    if (!record || typeof record.playerId !== "number") return [];
    return [
      {
        playerId: record.playerId,
        firstName: parseName(record, "firstName"),
        lastName: parseName(record, "lastName"),
        position: String(record.positionCode ?? "F"),
        gamesPlayed: num(record.gamesPlayed),
        goals: num(record.goals),
        assists: num(record.assists),
        points: num(record.points),
        plusMinus: num(record.plusMinus),
        penaltyMinutes: num(record.penaltyMinutes),
        shots: num(record.shots),
        timeOnIceSeconds: Math.round(num(record.avgTimeOnIcePerGame)),
        headshot: typeof record.headshot === "string" ? record.headshot : undefined,
      },
    ];
  });
  const goalies = (Array.isArray(root?.goalies) ? root.goalies : []).flatMap((row) => {
    const record = asRecord(row);
    if (!record || typeof record.playerId !== "number") return [];
    return [
      {
        playerId: record.playerId,
        firstName: parseName(record, "firstName"),
        lastName: parseName(record, "lastName"),
        gamesPlayed: num(record.gamesPlayed),
        wins: num(record.wins),
        losses: num(record.losses),
        saves: num(record.saves),
        shotsAgainst: num(record.shotsAgainst),
        goalsAgainst: num(record.goalsAgainst),
        savePercentage: num(record.savePercentage),
        timeOnIceSeconds: Math.round(num(record.timeOnIce)),
        penaltyMinutes: num(record.penaltyMinutes),
        headshot: typeof record.headshot === "string" ? record.headshot : undefined,
      },
    ];
  });
  return { skaters, goalies };
}

export function parseNhlRoster(payload: unknown): NhlRosterPlayer[] {
  const root = asRecord(payload);
  const groups = ["forwards", "defensemen", "goalies"] as const;
  const players: NhlRosterPlayer[] = [];
  for (const group of groups) {
    const rows = Array.isArray(root?.[group]) ? root[group] : [];
    for (const row of rows) {
      const record = asRecord(row);
      if (!record || typeof record.id !== "number") continue;
      const shoots = record.shootsCatches === "L" ? "L" : "R";
      players.push({
        id: record.id,
        firstName: parseName(record, "firstName"),
        lastName: parseName(record, "lastName"),
        position: String(record.positionCode ?? (group === "goalies" ? "G" : "F")),
        shoots,
        birthDate: typeof record.birthDate === "string" ? record.birthDate : undefined,
        heightCm: num(record.heightInCentimeters),
        weightKg: num(record.weightInKilograms),
        birthCountry: typeof record.birthCountry === "string" ? record.birthCountry : "",
        headshot: typeof record.headshot === "string" ? record.headshot : undefined,
      });
    }
  }
  return players;
}

const SHOT_TYPES = new Set(["shot-on-goal", "goal", "missed-shot"]);

export function parseNhlPlayByPlayShots(payload: unknown, gameId: string): NhlShotEvent[] {
  const root = asRecord(payload);
  const plays = Array.isArray(root?.plays) ? root.plays : [];
  const shots: NhlShotEvent[] = [];
  for (const play of plays) {
    const row = asRecord(play);
    if (!row || !SHOT_TYPES.has(String(row.typeDescKey))) continue;
    const details = asRecord(row.details);
    if (!details) continue;
    const x = optionalNum(details.xCoord);
    const y = optionalNum(details.yCoord);
    const playerId = optionalNum(details.shootingPlayerId ?? details.scoringPlayerId);
    const eventId = row.eventId ?? row.sortOrder;
    if (x == null || y == null || playerId == null || eventId == null) continue;
    if (!isPlausibleNhlCoordinate(x, y)) continue;
    shots.push({
      gameId,
      externalPlayId: String(eventId),
      playerId,
      x,
      y,
      made: String(row.typeDescKey) === "goal",
      shotType: typeof details.shotType === "string" ? details.shotType : String(row.typeDescKey),
    });
  }
  return shots;
}

async function nhlGet(path: string): Promise<unknown> {
  const response = await fetch(`${NHL_API}${path}`, {
    headers: NHL_FETCH_HEADERS,
    next: { revalidate: 180 },
  });
  if (!response.ok) {
    throw new Error(`NHL ${path} failed (${response.status})`);
  }
  return response.json();
}

export async function fetchNhlScheduleWeek(date: string): Promise<ReturnType<typeof parseNhlSchedule>> {
  return parseNhlSchedule(await nhlGet(`/schedule/${date}`));
}

export async function fetchNhlStandings(): Promise<NhlStandingRow[]> {
  return parseNhlStandings(await nhlGet("/standings/now"));
}

export async function fetchNhlClubStats(abbrev: string, seasonId: string): Promise<ReturnType<typeof parseNhlClubStats>> {
  return parseNhlClubStats(await nhlGet(`/club-stats/${abbrev}/${seasonId}/2`));
}

export async function fetchNhlRoster(abbrev: string, seasonId: string): Promise<NhlRosterPlayer[]> {
  return parseNhlRoster(await nhlGet(`/roster/${abbrev}/${seasonId}`));
}

export async function fetchNhlPlayByPlayShots(gameId: string): Promise<NhlShotEvent[]> {
  return parseNhlPlayByPlayShots(await nhlGet(`/gamecenter/${gameId}/play-by-play`), gameId);
}

/** Walk played weeks back to the regular-season start, plus a short upcoming window. */
export async function fetchNhlScheduleWindow(anchorDate: string, maxWeeks = 24): Promise<NhlScheduleGame[]> {
  const byId = new Map<number, NhlScheduleGame>();
  let cursor: string | null = anchorDate;
  let floor: string | null = null;
  for (let i = 0; i < maxWeeks && cursor; i += 1) {
    const week = await fetchNhlScheduleWeek(cursor);
    floor = week.regularSeasonStartDate ?? floor;
    for (const game of week.games) byId.set(game.id, game);
    const previous = week.previousStartDate;
    if (!previous || (floor && previous < floor)) break;
    cursor = previous;
  }

  cursor = anchorDate;
  for (let i = 0; i < 3 && cursor; i += 1) {
    const week = await fetchNhlScheduleWeek(cursor);
    for (const game of week.games) byId.set(game.id, game);
    if (!week.nextStartDate || week.nextStartDate === cursor) break;
    cursor = week.nextStartDate;
  }

  return [...byId.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}
