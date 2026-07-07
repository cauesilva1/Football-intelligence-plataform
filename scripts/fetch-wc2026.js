#!/usr/bin/env node
/**
 * Extrai jogos da Copa do Mundo 2026 via feed público ESPN (JSON)
 * e persiste em src/data/mock/world-cup-2026.json no formato StatsBomb.
 *
 * Uso: node scripts/fetch-wc2026.js
 *      npm run fetch:wc2026
 */

const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";

const OUTPUT = path.join(__dirname, "../src/data/mock/world-cup-2026.json");

const STAGE_BY_SLUG = {
  "group-stage": { id: 10, name: "Group Stage" },
  "round-of-32": { id: 32, name: "Round of 32" },
  "round-of-16": { id: 33, name: "Round of 16" },
  quarterfinals: { id: 11, name: "Quarter-finals" },
  semifinals: { id: 15, name: "Semi-finals" },
  "3rd-place-match": { id: 25, name: "Third Place" },
  final: { id: 26, name: "Final" },
};

const COUNTRY_NAMES = {
  USA: "United States",
  US: "United States",
  MEX: "Mexico",
  CAN: "Canada",
};

function parseStage(event) {
  const slug = event.season?.slug;
  if (slug && STAGE_BY_SLUG[slug]) return STAGE_BY_SLUG[slug];

  const note = event.competitions?.[0]?.altGameNote ?? "";
  if (/group/i.test(note)) return STAGE_BY_SLUG["group-stage"];
  if (/round of 32/i.test(note)) return STAGE_BY_SLUG["round-of-32"];
  if (/round of 16/i.test(note)) return STAGE_BY_SLUG["round-of-16"];
  if (/quarter/i.test(note)) return STAGE_BY_SLUG.quarterfinals;
  if (/semi/i.test(note)) return STAGE_BY_SLUG.semifinals;
  if (/3rd|third/i.test(note)) return STAGE_BY_SLUG["3rd-place-match"];
  if (/final/i.test(note)) return STAGE_BY_SLUG.final;

  return { id: 0, name: "Outros" };
}

function parseGroupLetter(note) {
  const match = note.match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

function toKickOff(isoDate) {
  const d = new Date(isoDate);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}.000`;
}

function toMatchDate(isoDate) {
  return isoDate.slice(0, 10);
}

function parseScore(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseLinescores(competitors) {
  return competitors.map((c) => {
    const lines = c.linescores ?? [];
    const halves = lines.slice(0, 2).map((l) => parseScore(l.displayValue) ?? 0);
    const extra = lines.slice(2, 4).map((l) => parseScore(l.displayValue) ?? 0);
    const pens = lines.length >= 5 ? parseScore(lines[4].displayValue) : null;
    const regulation = halves.reduce((a, b) => a + b, 0);
    const extraTotal = extra.reduce((a, b) => a + b, 0);
    return {
      regulation,
      afterExtra: regulation + extraTotal,
      penalties: pens,
      total: parseScore(c.score),
    };
  });
}

function mapMatchStatus(statusType, state) {
  if (!statusType) return "scheduled";
  const name = statusType.name ?? "";
  const stateVal = state ?? statusType.state;

  if (stateVal === "in") return "live";
  if (stateVal === "post" && statusType.completed) return "available";

  const preStates = new Set(["pre", "scheduled"]);
  if (preStates.has(stateVal)) return "scheduled";

  return "scheduled";
}

function buildStadium(venue) {
  const countryCode = venue?.address?.country ?? "USA";
  const countryName = COUNTRY_NAMES[countryCode] ?? countryCode;
  return {
    id: Number(venue?.id) || 0,
    name: venue?.fullName ?? "A definir",
    country: {
      id: 0,
      name: countryName,
    },
  };
}

function mapEventToMatch(event, index, penaltyDetails) {
  const comp = event.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");

  if (!home || !away) return null;

  const stage = parseStage(event);
  const groupLetter = parseGroupLetter(comp.altGameNote ?? "");
  const isoDate = comp.startDate ?? event.date;
  const statusType = comp.status?.type;
  const isPenalty = statusType?.name === "STATUS_FINAL_PEN";
  const isAet = statusType?.name === "STATUS_FINAL_AET";

  let homeScore = parseScore(home.score);
  let awayScore = parseScore(away.score);
  let homeRegular = homeScore;
  let awayRegular = awayScore;
  let homePenalties = null;
  let awayPenalties = null;

  const detail = penaltyDetails?.[event.id];
  if (detail) {
    const [homeLine, awayLine] = detail;
    homeRegular = homeLine.regulation;
    awayRegular = awayLine.regulation;
    if (isAet) {
      homeRegular = homeLine.afterExtra;
      awayRegular = awayLine.afterExtra;
    }
    if (isPenalty) {
      homePenalties = homeLine.penalties;
      awayPenalties = awayLine.penalties;
      homeScore = homeLine.total;
      awayScore = awayLine.total;
    }
  }

  const matchStatus = mapMatchStatus(statusType, comp.status?.type?.state);

  return {
    match_id: 2026000 + index + 1,
    match_date: toMatchDate(isoDate),
    kick_off: toKickOff(isoDate),
    competition: {
      competition_id: 43,
      country_name: "International",
      competition_name: "FIFA World Cup",
    },
    season: {
      season_id: 2026,
      season_name: "2026",
    },
    home_team: {
      home_team_id: Number(home.team?.id ?? home.id),
      home_team_name: home.team?.displayName ?? home.team?.name ?? "TBD",
      ...(groupLetter ? { home_team_group: groupLetter } : {}),
    },
    away_team: {
      away_team_id: Number(away.team?.id ?? away.id),
      away_team_name: away.team?.displayName ?? away.team?.name ?? "TBD",
      ...(groupLetter ? { away_team_group: groupLetter } : {}),
    },
    home_score: homeScore,
    away_score: awayScore,
    home_score_regular: homeRegular,
    away_score_regular: awayRegular,
    ...(homePenalties != null ? { home_score_penalties: homePenalties } : {}),
    ...(awayPenalties != null ? { away_score_penalties: awayPenalties } : {}),
    match_status: matchStatus,
    competition_stage: stage,
    stadium: buildStadium(comp.venue),
    metadata: {
      source: "espn-public-api",
      espn_event_id: event.id,
      fetched_at: new Date().toISOString(),
      status_detail: statusType?.description ?? null,
    },
  };
}

async function fetchScoreboard() {
  const { data } = await axios.get(ESPN_SCOREBOARD, {
    params: {
      dates: "20260611-20260720",
      limit: 200,
    },
    timeout: 30000,
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (wc2026-scraper)",
    },
  });

  return data.events ?? [];
}

async function fetchPenaltyDetails(eventId) {
  const { data } = await axios.get(ESPN_SUMMARY, {
    params: { event: eventId },
    timeout: 20000,
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (wc2026-scraper)",
    },
  });

  const comp = data.header?.competitions?.[0];
  if (!comp?.competitors?.length) return null;

  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  return parseLinescores([home, away]);
}

async function main() {
  console.log("[fetch-wc2026] Buscando jogos na ESPN (feed público)...");

  const events = await fetchScoreboard();
  if (!events.length) {
    throw new Error("Nenhum jogo retornado pela fonte ESPN.");
  }

  const penaltyEvents = events.filter((e) => {
    const name = e.competitions?.[0]?.status?.type?.name ?? "";
    return name === "STATUS_FINAL_PEN" || name === "STATUS_FINAL_AET";
  });

  const penaltyDetails = {};
  for (const event of penaltyEvents) {
    try {
      const lines = await fetchPenaltyDetails(event.id);
      if (lines) penaltyDetails[event.id] = lines;
      await new Promise((r) => setTimeout(r, 120));
    } catch (error) {
      console.warn(`[fetch-wc2026] Falha ao detalhar ${event.id}:`, error.message);
    }
  }

  const matches = events
    .map((event, index) => mapEventToMatch(event, index, penaltyDetails))
    .filter(Boolean)
    .sort((a, b) => {
      const dateCmp = a.match_date.localeCompare(b.match_date);
      if (dateCmp !== 0) return dateCmp;
      return a.kick_off.localeCompare(b.kick_off);
    });

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(matches, null, 2)}\n`, "utf8");

  const played = matches.filter((m) => m.match_status === "available").length;
  const scheduled = matches.filter((m) => m.match_status === "scheduled").length;
  const live = matches.filter((m) => m.match_status === "live").length;

  console.log(`[fetch-wc2026] ${matches.length} jogos salvos em ${OUTPUT}`);
  console.log(`[fetch-wc2026] Encerrados: ${played} · Agendados: ${scheduled} · Ao vivo: ${live}`);
}

main().catch((error) => {
  console.error("[fetch-wc2026] Erro:", error.message);
  process.exit(1);
});
