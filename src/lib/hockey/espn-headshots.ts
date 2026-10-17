import type { PrismaClient } from "@prisma/client";
import { fetchNhlRoster } from "@/lib/api/nhl";
import { nhlApiSeasonId } from "@/lib/hockey/season";

const ESPN_NHL = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";

/** ESPN abbreviates a few clubs differently from the NHL feed. */
const TEAM_ALIAS: Record<string, string> = {
  UTA: "UTAH",
  UTAH: "UTAH",
  LAK: "LA",
  LA: "LA",
  NJD: "NJ",
  NJ: "NJ",
  SJS: "SJ",
  SJ: "SJ",
  TBL: "TB",
  TB: "TB",
};

export interface EspnHeadshotCandidate {
  teamAbbrev: string;
  fullName: string;
  headshotUrl: string;
}

export function canonicalNhlAbbrev(abbrev: string): string {
  const key = abbrev.trim().toUpperCase();
  return TEAM_ALIAS[key] ?? key;
}

export function normalizeHockeyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Exact full-name match inside one club. A duplicated name on either side
 * matches nobody — a wrong headshot is worse than initials.
 */
export function matchUniqueEspnHeadshots(
  players: Array<{ id: string; teamAbbrev: string; fullName: string }>,
  athletes: EspnHeadshotCandidate[]
): Array<{ id: string; headshotUrl: string }> {
  const athleteKeys = new Map<string, string[]>();
  for (const athlete of athletes) {
    const key = headshotKey(athlete.teamAbbrev, athlete.fullName);
    const urls = athleteKeys.get(key) ?? [];
    if (!urls.includes(athlete.headshotUrl)) urls.push(athlete.headshotUrl);
    athleteKeys.set(key, urls);
  }

  const playerKeys = new Map<string, string[]>();
  for (const player of players) {
    const key = headshotKey(player.teamAbbrev, player.fullName);
    const ids = playerKeys.get(key) ?? [];
    ids.push(player.id);
    playerKeys.set(key, ids);
  }

  const matched: Array<{ id: string; headshotUrl: string }> = [];
  for (const player of players) {
    const key = headshotKey(player.teamAbbrev, player.fullName);
    const urls = athleteKeys.get(key) ?? [];
    const ids = playerKeys.get(key) ?? [];
    if (urls.length !== 1 || ids.length !== 1) continue;
    matched.push({ id: player.id, headshotUrl: urls[0]! });
  }
  return matched;
}

function headshotKey(teamAbbrev: string, fullName: string): string {
  return `${canonicalNhlAbbrev(teamAbbrev)}|${normalizeHockeyName(fullName)}`;
}

export function isForeignHockeyPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  return /transfermarkt|api-sports\.io\/football/i.test(url);
}

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

async function espnGet(path: string): Promise<unknown> {
  const response = await fetch(`${ESPN_NHL}${path}`, {
    headers: { "User-Agent": "football-intelligence-platform/1.0 (nhl-headshots)" },
  });
  if (!response.ok) throw new Error(`ESPN NHL ${path} failed (${response.status})`);
  return response.json();
}

function collectAthletes(node: unknown, into: Array<{ fullName: string; headshotUrl: string }>) {
  if (Array.isArray(node)) {
    for (const item of node) collectAthletes(item, into);
    return;
  }
  const record = asRecord(node);
  if (!record) return;
  const fullName = typeof record.displayName === "string" ? record.displayName.trim() : "";
  const headshot = asRecord(record.headshot);
  const href = typeof headshot?.href === "string" ? headshot.href : "";
  if (fullName && href.includes("a.espncdn.com/i/headshots/nhl/")) {
    into.push({ fullName, headshotUrl: href });
  }
  for (const value of Object.values(record)) collectAthletes(value, into);
}

export async function fetchEspnNhlHeadshots(): Promise<EspnHeadshotCandidate[]> {
  const payload = await espnGet("/teams");
  const sports = Array.isArray(asRecord(payload)?.sports) ? (asRecord(payload)?.sports as unknown[]) : [];
  const leagues = asRecord(sports[0])?.leagues;
  const league = Array.isArray(leagues) ? asRecord(leagues[0]) : null;
  const teams = Array.isArray(league?.teams) ? league.teams : [];
  const candidates: EspnHeadshotCandidate[] = [];

  for (const wrap of teams) {
    const team = asRecord(asRecord(wrap)?.team);
    const abbrev = typeof team?.abbreviation === "string" ? team.abbreviation : "";
    const id = team?.id != null ? String(team.id) : "";
    if (!abbrev || !id) continue;
    const roster = await espnGet(`/teams/${id}/roster`);
    const athletes: Array<{ fullName: string; headshotUrl: string }> = [];
    collectAthletes(roster, athletes);
    for (const athlete of athletes) {
      candidates.push({ teamAbbrev: abbrev, ...athlete });
    }
  }
  return candidates;
}

export async function refreshHockeyHeadshots(
  prisma: PrismaClient,
  log: (message: string) => void = () => undefined
): Promise<{ players: number; espnMatched: number; cleared: number }> {
  const players = await prisma.player.findMany({
    where: { sport: "HOCKEY" },
    select: {
      id: true,
      fullName: true,
      apiSportsId: true,
      photoUrl: true,
      team: { select: { shortName: true } },
    },
  });
  const withClub = players.flatMap((player) =>
    player.team?.shortName
      ? [{ id: player.id, teamAbbrev: player.team.shortName, fullName: player.fullName }]
      : []
  );
  const athletes = await fetchEspnNhlHeadshots();
  const espnById = new Map(
    matchUniqueEspnHeadshots(withClub, athletes).map((row) => [row.id, row.headshotUrl])
  );

  const nhlById = new Map<number, string>();
  const season = nhlApiSeasonId();
  const abbrevs = [...new Set(withClub.map((player) => player.teamAbbrev))];
  for (const abbrev of abbrevs) {
    try {
      const roster = await fetchNhlRoster(abbrev, season);
      for (const player of roster) {
        if (player.headshot) nhlById.set(player.id, player.headshot);
      }
    } catch (error) {
      log(`headshot roster ${abbrev} skipped: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  let cleared = 0;
  for (const player of players) {
    const espnUrl = espnById.get(player.id) ?? null;
    const nhlUrl = player.apiSportsId != null ? (nhlById.get(player.apiSportsId) ?? null) : null;
    const next = espnUrl ?? nhlUrl;
    if (next && next !== player.photoUrl) {
      await prisma.player.update({ where: { id: player.id }, data: { photoUrl: next } });
    } else if (!next && isForeignHockeyPhoto(player.photoUrl)) {
      await prisma.player.update({ where: { id: player.id }, data: { photoUrl: null } });
      cleared += 1;
    }
  }

  log(
    `headshots: ${espnById.size}/${players.length} unique ESPN matches, ${cleared} foreign portraits removed`
  );
  return { players: players.length, espnMatched: espnById.size, cleared };
}
