import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { CURRENT_SEASON, resolveEspnSeasonYear } from "@/lib/seasons";
import { isBrazilianLeague } from "@/lib/api/transfermarkt";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import { resolveEspnLeague } from "@/lib/crests/espn-standings";

const ESPN_SCOREBOARD_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export interface EspnScoreboardEvent {
  externalKey: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  round?: string;
  status: string;
  seasonLabel: string;
  espnSlug: string;
  competitionLabel: string;
}

interface EspnScoreboardResponse {
  events?: Array<{
    id: string;
    name: string;
    date: string;
    status?: { type?: { name?: string; state?: string } };
    competitions?: Array<{
      notes?: Array<{ headline?: string }>;
      competitors?: Array<{
        homeAway: "home" | "away";
        score?: string;
        team?: { displayName?: string; name?: string };
      }>;
    }>;
  }>;
}

function formatEspnDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function parseScore(raw?: string): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function mapEventStatus(state?: string, name?: string): string {
  if (state === "in") return "live";
  if (state === "post") return "finished";
  if (name?.toLowerCase().includes("postponed")) return "postponed";
  return "scheduled";
}

export async function fetchEspnScoreboard(
  slug: string,
  competitionLabel: string,
  date?: Date
): Promise<EspnScoreboardEvent[]> {
  const params = new URLSearchParams({ limit: "100" });
  if (date) params.set("dates", formatEspnDate(date));

  const url = `${ESPN_SCOREBOARD_BASE}/${slug}/scoreboard?${params.toString()}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "football-intelligence-platform/1.0 (espn-matches)" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    console.warn(`[espn-matches] HTTP ${response.status} on ${slug}`);
    return [];
  }

  const data = (await response.json()) as EspnScoreboardResponse;
  const seasonLabel = CURRENT_SEASON;

  return (data.events ?? [])
    .map((event) => {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find((c) => c.homeAway === "home");
      const away = competition?.competitors?.find((c) => c.homeAway === "away");
      const homeName = home?.team?.displayName ?? home?.team?.name ?? "";
      const awayName = away?.team?.displayName ?? away?.team?.name ?? "";
      if (!homeName || !awayName) return null;

      const row: EspnScoreboardEvent = {
        externalKey: `espn:${slug}:${event.id}`,
        homeTeamName: homeName,
        awayTeamName: awayName,
        homeScore: parseScore(home?.score),
        awayScore: parseScore(away?.score),
        matchDate: new Date(event.date),
        round: competition?.notes?.[0]?.headline,
        status: mapEventStatus(event.status?.type?.state, event.status?.type?.name),
        seasonLabel,
        espnSlug: slug,
        competitionLabel,
      };
      return row;
    })
    .filter((row): row is EspnScoreboardEvent => row != null);
}

async function resolveTeamIdByName(name: string): Promise<string | null> {
  const prisma = getPrisma();
  const teams = await prisma.team.findMany({ select: { id: true, name: true, shortName: true } });

  const match = teams.find(
    (team) => namesLikelyMatch(team.name, name) || namesLikelyMatch(team.shortName, name)
  );
  return match?.id ?? null;
}

async function resolveCompetitionId(
  competitionName: string,
  espnSlug: string
): Promise<string | null> {
  const prisma = getPrisma();
  const competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { name: { contains: competitionName.split(" ")[0], mode: "insensitive" } },
        { espnSlug },
      ],
    },
  });

  if (competition) {
    if (!competition.espnSlug) {
      await prisma.competition.update({
        where: { id: competition.id },
        data: { espnSlug },
      });
    }
    return competition.id;
  }

  return null;
}

/** Persist ESPN fixtures into the Match table (upsert by externalKey). */
export async function persistEspnMatches(events: EspnScoreboardEvent[]): Promise<number> {
  if (!canUseDatabase() || events.length === 0) return 0;

  const prisma = getPrisma();
  let saved = 0;

  for (const event of events) {
    const [homeTeamId, awayTeamId] = await Promise.all([
      resolveTeamIdByName(event.homeTeamName),
      resolveTeamIdByName(event.awayTeamName),
    ]);

    if (!homeTeamId || !awayTeamId) continue;

    const config = resolveEspnLeague(event.competitionLabel);
    const competitionId = config
      ? await resolveCompetitionId(config.competitionLabel, config.slug)
      : null;

    await prisma.match.upsert({
      where: { externalKey: event.externalKey },
      create: {
        externalKey: event.externalKey,
        homeTeamId,
        awayTeamId,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        matchDate: event.matchDate,
        round: event.round,
        status: event.status,
        seasonLabel: event.seasonLabel,
        source: "espn",
        competitionId: competitionId ?? undefined,
      },
      update: {
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        matchDate: event.matchDate,
        round: event.round,
        status: event.status,
        seasonLabel: event.seasonLabel,
        competitionId: competitionId ?? undefined,
      },
    });

    saved += 1;
  }

  return saved;
}

/** Sync recent fixtures for a competition (yesterday + today). */
export async function syncEspnMatchesForCompetition(
  competitionName?: string | null
): Promise<number> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return 0;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  try {
    const [todayEvents, yesterdayEvents, recentEvents] = await Promise.all([
      fetchEspnScoreboard(config.slug, config.competitionLabel, today),
      fetchEspnScoreboard(config.slug, config.competitionLabel, yesterday),
      fetchEspnScoreboard(config.slug, config.competitionLabel),
    ]);

    const merged = new Map<string, EspnScoreboardEvent>();
    for (const event of [...recentEvents, ...yesterdayEvents, ...todayEvents]) {
      merged.set(event.externalKey, event);
    }

    return await persistEspnMatches([...merged.values()]);
  } catch (error) {
    console.warn("[espn-matches] Sync failed for", competitionName, error);
    return 0;
  }
}

export { resolveEspnSeasonYear, isBrazilianLeague };
