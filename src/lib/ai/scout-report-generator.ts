import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import { loadLeaguePercentileContext } from "@/features/scouting/queries/league-percentiles";
import { withBriefContext } from "@/lib/export/scout-brief-context";
import { toBriefIntelligenceSnapshot } from "@/lib/export/scout-brief-intelligence";
import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import { adaptSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/adapter";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { lookupPlayerPercentileScores } from "@/lib/intelligence/soccer/league-percentiles";
import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import { expectedGoalsAreMeasured } from "@/lib/metrics/expected-goals";
import { computeReportOverallRating } from "@/lib/scoring/soccer-rating";
import { computeBasketballReportOverallRating } from "@/lib/scoring/basketball-rating";
import { computeFootballReportOverallRating } from "@/lib/scoring/football-rating";
import type { Player, ScoutingReport, TacticalFit } from "@/lib/types";
import { formatCapHit, formatMarketValue } from "@/lib/utils";

const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3.8-27b:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Free OpenRouter IDs rotate. Override with OPENROUTER_MODEL when the default 404s. */
export function resolveOpenRouterModel(
  env: { OPENROUTER_MODEL?: string } = process.env as { OPENROUTER_MODEL?: string }
): string {
  const configured = env.OPENROUTER_MODEL?.trim();
  return configured || DEFAULT_OPENROUTER_MODEL;
}

const SYSTEM_PROMPT_SOCCER = `You are a professional football scout analyst writing structured scouting reports for a analytics platform.

CRITICAL: Every text field in your JSON response MUST be written in English only (Player Summary, Playing Style, Technical Recommendation, strengths, weaknesses, tactical narrative).

Return ONLY valid JSON matching this schema:
{
  "summary": "string — quantitative player summary for the current season",
  "strengths": ["string", "..."],
  "weaknesses": ["string", "..."],
  "playingStyle": {
    "label": "string",
    "description": "string",
    "traits": ["string", "..."]
  },
  "tacticalFit": {
    "systems": ["string", "..."],
    "roles": ["string", "..."],
    "narrative": "string"
  },
  "recommendation": "string — scouting verdict for recruitment"
}

Use industry-standard analytics language (per 90, xG, xA). The only overall rating is serverOverallRating in the dataset. If you mention an overall rating, repeat that number. Do not compute a different one.
When expected goals are marked not measured, omit xG and xA. Never invent them or treat a missing value as zero.
When the dataset says league percentiles are unavailable, omit percentile ranks. Never invent them.`;

const SYSTEM_PROMPT_BASKETBALL = `You are a professional basketball scout analyst writing structured scouting reports for an analytics platform.

CRITICAL: Every text field in your JSON response MUST be written in English only.

Return ONLY valid JSON matching this schema:
{
  "summary": "string — quantitative player summary for the current season",
  "strengths": ["string", "..."],
  "weaknesses": ["string", "..."],
  "playingStyle": {
    "label": "string",
    "description": "string",
    "traits": ["string", "..."]
  },
  "tacticalFit": {
    "systems": ["string", "..."],
    "roles": ["string", "..."],
    "narrative": "string"
  },
  "recommendation": "string — scouting verdict for recruitment / draft / free agency"
}

Use basketball analytics language (PPG, RPG, APG, FG%, 3P%, SPG, BPG, MPG). Do not invent overall rating — it is computed server-side.`;

const SYSTEM_PROMPT_FOOTBALL = `You are a professional American football scout analyst writing structured scouting reports for an analytics platform.

CRITICAL: Every text field in your JSON response MUST be written in English only.

Return ONLY valid JSON matching this schema:
{
  "summary": "string — quantitative player summary for the current season",
  "strengths": ["string", "..."],
  "weaknesses": ["string", "..."],
  "playingStyle": {
    "label": "string",
    "description": "string",
    "traits": ["string", "..."]
  },
  "tacticalFit": {
    "systems": ["string", "..."],
    "roles": ["string", "..."],
    "narrative": "string"
  },
  "recommendation": "string — scouting verdict for draft / free agency / trade"
}

Use football analytics language (yards, TDs, sacks, tackles, completion rate when relevant, Cap Hit). Do not invent overall rating — it is computed server-side.`;

function playerSport(player: Player): "SOCCER" | "BASKETBALL" | "AMERICAN_FOOTBALL" {
  const sport = player.sport ?? "SOCCER";
  if (sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL") return sport;
  return "SOCCER";
}

function resolveTacticalFit(player: Player): TacticalFit {
  const sport = playerSport(player);
  if (sport === "BASKETBALL") return buildBasketballTacticalFit(player);
  if (sport === "AMERICAN_FOOTBALL") return buildFootballTacticalFit(player);
  return buildTacticalFit(player);
}

function resolveSystemPrompt(player: Player): string {
  const sport = playerSport(player);
  if (sport === "BASKETBALL") return SYSTEM_PROMPT_BASKETBALL;
  if (sport === "AMERICAN_FOOTBALL") return SYSTEM_PROMPT_FOOTBALL;
  return SYSTEM_PROMPT_SOCCER;
}

interface LlmReportPayload {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  playingStyle?: { label?: string; description?: string; traits?: string[] };
  tacticalFit?: { systems?: string[]; roles?: string[]; narrative?: string };
  recommendation?: string;
  overallRating?: number;
}

function buildRecommendation(rating: number, age: number): string {
  if (rating >= 8.2) {
    return age < 26
      ? "Maximum recruitment priority — strong resale upside"
      : "Recommended signing for immediate impact";
  }
  if (rating >= 7.3) return "Recommended squad reinforcement — monitor progression next window";
  if (rating >= 6.5) return "Viable rotation option — reassess in 6 months";
  return "Not recommended at this time — track in youth or reserve competitions";
}

function buildSummary(player: Player): string {
  const s = player.currentSeasonStats;
  const p90 = s.per90;
  return [
    `${player.knownAs} (${player.age} years old, ${player.position}) played ${s.appearances} appearances (${s.minutesPlayed.toLocaleString("en-US")} min) in the 2025/26 season. `,
    `Normalized output: ${p90.goals.toFixed(2)} goals/90 and ${p90.assists.toFixed(2)} assists/90. `,
    `Estimated market value ${formatMarketValue(player.marketValue)} with an average rating of ${s.rating.toFixed(1)} `,
    `and ${s.passAccuracy.toFixed(0)}% pass accuracy.`,
  ].join("");
}

function buildTacticalFit(player: Player): TacticalFit {
  const s = player.currentSeasonStats;
  const p90 = s.per90;
  const pos = player.position;

  const systems: string[] = [];
  const roles: string[] = [];

  if (pos === "GK") {
    systems.push("4-3-3", "4-2-3-1", "3-5-2");
    roles.push("Last line", "Defensive organizer");
  } else if (pos === "CB") {
    systems.push(s.passAccuracy > 85 ? "3-2-5 build-up" : "Compact 4-4-2", "5-3-2");
    roles.push(
      p90.tackles + p90.interceptions > 2.5 ? "Ball-winning centre-back" : "Progressive centre-back",
      s.duelsWonPct > 55 ? "Aerial dominance" : "Cover defender"
    );
  } else if (pos === "LB" || pos === "RB") {
    systems.push("4-3-3", "3-5-2", "4-2-3-1");
    roles.push(
      p90.keyPasses > 1.2 ? "Attacking full-back" : "Balanced full-back",
      p90.dribbles > 1.5 ? "Progression by carrying" : "Crossing and overlap"
    );
  } else if (pos === "CDM") {
    systems.push("4-2-3-1", "Double pivot 4-3-3", "3-4-3");
    roles.push("Ball winner", p90.keyPasses > 1 ? "Deep playmaker" : "Defensive shield");
  } else if (pos === "CM") {
    systems.push("4-3-3", "4-1-4-1", "3-4-2-1");
    roles.push(
      p90.assists > 0.15 ? "Creative box-to-box midfielder" : "Transition midfielder",
      p90.tackles > 2 ? "Recovery in midfield" : "Possession distributor"
    );
  } else if (pos === "CAM") {
    systems.push("4-2-3-1", "3-4-2-1", "False 9 4-3-3");
    roles.push("Between-the-lines playmaker", p90.keyPasses > 2 ? "Final ball specialist" : "Late runner");
  } else if (pos === "LW" || pos === "RW") {
    systems.push("4-3-3", "3-4-3", "4-2-3-1");
    roles.push(
      p90.dribbles > 2 ? "1v1 wide forward" : "In-behind winger",
      p90.assists > p90.goals ? "Chance creator" : "Box finisher"
    );
  } else {
    systems.push("4-3-3", "4-2-3-1", "3-5-2");
    roles.push(
      p90.goals > 0.45 ? "Penalty-box reference" : "Mobile striker",
      p90.assists > 0.12 ? "Link striker" : "Box finisher"
    );
  }

  const style = derivePlayingStyle(player);
  const narrative = [
    `${style.label} profile fits systems that value ${style.traits[0]?.toLowerCase() ?? "tactical versatility"}.`,
    `With ${s.minutesPlayed.toLocaleString("en-US")} minutes this season, the player shows consistency to hold ${roles[0]?.toLowerCase() ?? "a defined role"} in ${systems[0] ?? "flexible shapes"}.`,
    player.secondaryPosition
      ? `Additional versatility as ${player.secondaryPosition} expands rotation options.`
      : `Primary position (${pos}) defines the priority tactical fit.`,
  ].join(" ");

  return {
    systems: [...new Set(systems)].slice(0, 3),
    roles: [...new Set(roles)].slice(0, 3),
    narrative,
  };
}

function buildBasketballSummary(player: Player): string {
  const s = player.currentSeasonStats;
  const g = s.perGame ?? {
    points: s.points ?? 0,
    rebounds: s.rebounds ?? 0,
    steals: s.steals ?? 0,
    blocks: s.blocks ?? 0,
    assists: s.assists,
  };
  return [
    `${player.knownAs} (${player.age} years old, ${player.position}) played ${s.appearances} games (${s.minutesPlayed.toLocaleString("en-US")} min) this season. `,
    `Per-game line: ${g.points.toFixed(1)} PPG, ${g.rebounds.toFixed(1)} RPG, ${g.assists.toFixed(1)} APG. `,
    `Estimated market value ${formatMarketValue(player.marketValue)} with a prototype rating of ${s.rating.toFixed(1)}.`,
  ].join("");
}

function buildBasketballTacticalFit(player: Player): TacticalFit {
  const s = player.currentSeasonStats;
  const g = s.perGame ?? {
    points: s.points ?? 0,
    rebounds: s.rebounds ?? 0,
    steals: s.steals ?? 0,
    blocks: s.blocks ?? 0,
    assists: s.assists,
  };
  const pos = player.position;
  const systems: string[] = [];
  const roles: string[] = [];

  if (pos === "PG" || pos === "SG") {
    systems.push("Pick-and-roll heavy", "Five-out spacing", "Transition push");
    roles.push(
      g.assists >= 6 ? "Primary initiator" : "Secondary creator",
      g.points >= 18 ? "Scoring guard" : "Connector"
    );
  } else if (pos === "SF") {
    systems.push("Switch defense", "Motion offense", "Corner spacing");
    roles.push(
      g.points >= 16 ? "Two-way wing" : "3-and-D wing",
      g.rebounds >= 6 ? "Rebounder wing" : "Cutter"
    );
  } else {
    systems.push("Drop coverage", "PnR as roll man", "Glass-cleaning five");
    roles.push(
      g.rebounds >= 9 ? "Boards specialist" : "Stretch big",
      g.blocks >= 1.2 ? "Rim protector" : "Finisher"
    );
  }

  const style = derivePlayingStyle(player);
  const narrative = [
    `${style.label} profile fits lineups that value ${style.traits[0]?.toLowerCase() ?? "versatility"}.`,
    `Across ${s.appearances} games, the player projects as ${roles[0]?.toLowerCase() ?? "a defined role"} in ${systems[0] ?? "flexible schemes"}.`,
  ].join(" ");

  return {
    systems: [...new Set(systems)].slice(0, 3),
    roles: [...new Set(roles)].slice(0, 3),
    narrative,
  };
}

function buildFootballSummary(player: Player): string {
  const s = player.currentSeasonStats;
  const games = Math.max(s.appearances, 1);
  const yards =
    s.totalYards ??
    (s.passingYards ?? 0) + (s.rushingYards ?? 0) + (s.receivingYards ?? 0);
  const tds = s.touchdowns ?? s.goals ?? 0;
  const sacks = s.sacks ?? 0;
  const yardsPerGame = yards / games;
  const valueLabel =
    (player.capHit ?? 0) > 0 ? formatCapHit(player.capHit ?? 0) : "Cap Hit unavailable";

  return [
    `${player.knownAs} (${player.age} years old, ${player.position}) played ${s.appearances} games this season. `,
    `Production: ${yards.toLocaleString("en-US")} total yards (${yardsPerGame.toFixed(1)}/G), ${tds} TD, ${sacks.toFixed(1)} sacks, ${s.tacklesWon} tackles. `,
    `${valueLabel} with a prototype rating of ${s.rating.toFixed(1)}.`,
  ].join("");
}

function buildFootballTacticalFit(player: Player): TacticalFit {
  const s = player.currentSeasonStats;
  const pos = player.position.toUpperCase();
  const yards =
    s.totalYards ??
    (s.passingYards ?? 0) + (s.rushingYards ?? 0) + (s.receivingYards ?? 0);
  const tds = s.touchdowns ?? s.goals ?? 0;
  const sacks = s.sacks ?? 0;
  const systems: string[] = [];
  const roles: string[] = [];

  if (pos === "QB") {
    systems.push("Shotgun spread", "Play-action under center", "RPO / movement");
    roles.push(
      yards >= 3_000 ? "Primary passer" : "Game-manager QB",
      tds >= 20 ? "Red-zone threat" : "Efficient distributor"
    );
  } else if (["WR", "TE", "RB", "FB", "HB"].includes(pos)) {
    systems.push("Outside zone", "Spread 11 personnel", "Motion / stack");
    roles.push(
      yards >= 800 ? "Feature skill player" : "Complementary skill",
      tds >= 6 ? "Scoring threat" : "Chain-mover"
    );
  } else if (["OT", "OG", "C", "OL", "G", "T"].includes(pos)) {
    systems.push("Outside zone", "Gap / power", "Pass-protection max");
    roles.push("Anchor blocker", "Scheme-fit OL");
  } else {
    systems.push("Odd front / nickel", "Wide-9 rush", "Cover 3 / quarters");
    roles.push(
      sacks >= 6 ? "Pass-rush specialist" : "Run-fit defender",
      s.tacklesWon >= 60 ? "Tackle machine" : "Situational defender"
    );
  }

  const style = derivePlayingStyle(player);
  const narrative = [
    `${style.label} profile fits schemes that value ${style.traits[0]?.toLowerCase() ?? "versatility"}.`,
    `Across ${s.appearances} games, the player projects as ${roles[0]?.toLowerCase() ?? "a defined role"} in ${systems[0] ?? "flexible packages"}.`,
  ].join(" ");

  return {
    systems: [...new Set(systems)].slice(0, 3),
    roles: [...new Set(roles)].slice(0, 3),
    narrative,
  };
}

function computeOverallRating(player: Player): number {
  const sport = playerSport(player);
  const s = player.currentSeasonStats;

  if (sport === "BASKETBALL") {
    return computeBasketballReportOverallRating({
      matchesPlayed: s.appearances,
      minutesPlayed: s.minutesPlayed,
      points: s.points ?? s.perGame?.points ?? 0,
      rebounds: s.rebounds ?? s.perGame?.rebounds ?? 0,
      assists: s.assists,
      steals: s.steals ?? s.perGame?.steals ?? 0,
      blocks: s.blocks ?? s.perGame?.blocks ?? 0,
      rating: s.rating,
    });
  }

  if (sport === "AMERICAN_FOOTBALL") {
    const passingYards = s.passingYards ?? 0;
    const rushingYards = s.rushingYards ?? 0;
    const receivingYards = s.receivingYards ?? 0;
    const totalYards = s.totalYards ?? passingYards + rushingYards + receivingYards;
    return computeFootballReportOverallRating(
      {
        matchesPlayed: s.appearances,
        minutesPlayed: s.minutesPlayed,
        totalYards,
        touchdowns: s.touchdowns ?? s.goals ?? 0,
        tackles: s.tacklesWon,
        sacks: s.sacks ?? 0,
        passingYards,
        rushingYards,
        receivingYards,
        rating: s.rating,
      },
      player.position
    );
  }

  return computeReportOverallRating(s);
}

function buildMockSummary(player: Player): string {
  const sport = playerSport(player);
  if (sport === "BASKETBALL") return buildBasketballSummary(player);
  if (sport === "AMERICAN_FOOTBALL") return buildFootballSummary(player);
  return buildSummary(player);
}

function buildMockReport(player: Player): ScoutingReport {
  const playingStyle = derivePlayingStyle(player);
  const rating = computeOverallRating(player);

  return withBriefContext(
    {
      id: `report-${player.id}-${Date.now()}`,
      playerId: player.id,
      summary: buildMockSummary(player),
      strengths: player.strengths,
      weaknesses: player.weaknesses,
      playingStyle: {
        label: playingStyle.label,
        description: playingStyle.description,
        traits: playingStyle.traits,
      },
      tacticalFit: resolveTacticalFit(player),
      recommendation: buildRecommendation(rating, player.age),
      overallRating: rating,
      generatedBy: "mock-ai-v2",
      createdAt: new Date().toISOString(),
    },
    player
  );
}

export interface ScoutPercentilePrompt {
  available: boolean;
  cohortSize?: number;
  league?: string;
  position?: string;
  season?: string;
  rows?: Array<{ label: string; percentile: number }>;
}

const PERCENTILE_LABELS: Record<string, string> = {
  production: "Production (per-90 composite)",
  creation: "Creation (per-90 composite)",
  defense: "Defense (per-90 composite)",
  ball_progression: "Ball progression (per-90 composite)",
};

/** League percentile rows for the prompt. Null table or cohort under 8 stays unavailable. */
export async function resolveSoccerPercentilePrompt(
  player: Player
): Promise<ScoutPercentilePrompt> {
  const table = await loadLeaguePercentileContext(player);
  if (!table || table.sport !== "SOCCER" || table.cohortSize < 8) {
    return { available: false, cohortSize: table && "cohortSize" in table ? table.cohortSize : 0 };
  }

  const scores = lookupPlayerPercentileScores(player, table);
  if (!scores) return { available: false, cohortSize: table.cohortSize };

  return {
    available: true,
    cohortSize: table.cohortSize,
    league: table.league,
    position: table.position,
    season: table.season,
    rows: (Object.keys(PERCENTILE_LABELS) as Array<keyof typeof scores>).map((key) => ({
      label: PERCENTILE_LABELS[key],
      percentile: scores[key],
    })),
  };
}

export function alignNarrativeWithServerRating(text: string, rating: number): string {
  const canonical = rating.toFixed(1);
  return text.replace(
    /\b((?:overall|scout|scouting) rating(?:\s+of|\s+is|:)?)\s*\d+(?:\.\d+)?/gi,
    `$1 ${canonical}`
  );
}

function percentileBlock(prompt: ScoutPercentilePrompt | null): string {
  if (!prompt || !prompt.available || !prompt.rows?.length) {
    const size = prompt?.cohortSize ?? 0;
    return [
      "PER-90 LEAGUE PERCENTILES",
      `Unavailable (cohort ${size}, minimum 8). Omit percentile ranks. Do not invent them.`,
    ].join("\n");
  }

  const header = [
    "PER-90 LEAGUE PERCENTILES",
    `Cohort ${prompt.cohortSize} (minimum 8) · ${prompt.league} · ${prompt.position} · ${prompt.season}`,
    ...prompt.rows.map((row) => `- ${row.label}: ${row.percentile}`),
  ];
  return header.join("\n");
}

export function buildScoutUserPrompt(
  player: Player,
  percentiles: ScoutPercentilePrompt | null = null
): string {
  const rating = computeOverallRating(player);
  const dataset = JSON.parse(buildPlayerContext(player)) as Record<string, unknown>;
  dataset.serverOverallRating = rating;
  const soccer = playerSport(player) === "SOCCER";

  return [
    "Generate a scouting report JSON for this player dataset:",
    JSON.stringify(dataset, null, 2),
    "",
    ...(soccer ? [percentileBlock(percentiles), ""] : []),
    `HONESTY: serverOverallRating is ${rating.toFixed(1)}. Repeat that number if you mention an overall rating. Do not state a different one.`,
    ...(soccer
      ? [
          "If expected goals are not measured, omit xG and xA.",
          "If league percentiles are unavailable, omit percentile ranks.",
        ]
      : []),
  ].join("\n");
}

function buildPlayerContext(player: Player): string {
  const s = player.currentSeasonStats;
  const sport = playerSport(player);
  const g = s.perGame;
  const valueField =
    sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL"
      ? { capHit: formatCapHit(player.capHit ?? 0) }
      : { marketValue: formatMarketValue(player.marketValue) };

  const seasonStats =
    sport === "BASKETBALL"
      ? {
          appearances: s.appearances,
          minutesPlayed: s.minutesPlayed,
          rating: s.rating,
          points: s.points ?? g?.points,
          rebounds: s.rebounds ?? g?.rebounds,
          assists: s.assists,
          steals: s.steals ?? g?.steals,
          blocks: s.blocks ?? g?.blocks,
          fieldGoalsPercent: s.fieldGoalsPercent,
          threePointsPercent: s.threePointsPercent,
        }
      : sport === "AMERICAN_FOOTBALL"
        ? {
            appearances: s.appearances,
            minutesPlayed: s.minutesPlayed,
            rating: s.rating,
            totalYards: s.totalYards,
            passingYards: s.passingYards,
            rushingYards: s.rushingYards,
            receivingYards: s.receivingYards,
            touchdowns: s.touchdowns ?? s.goals,
            sacks: s.sacks,
            tackles: s.tacklesWon,
          }
        : {
            appearances: s.appearances,
            minutesPlayed: s.minutesPlayed,
            goals: s.goals,
            assists: s.assists,
            rating: s.rating,
            passAccuracy: s.passAccuracy,
            per90: s.per90,
            ...(expectedGoalsAreMeasured(s.xG, s.xA)
              ? { xG: s.xG, xA: s.xA, expectedGoals: "measured" }
              : {
                  expectedGoals:
                    "not measured — omit xG and xA; do not invent values or treat them as zero",
                }),
          };

  return JSON.stringify(
    {
      player: {
        name: player.fullName,
        knownAs: player.knownAs,
        age: player.age,
        position: player.position,
        secondaryPosition: player.secondaryPosition,
        nationality: player.nationality,
        team: player.teamName,
        sport,
        ...valueField,
        strengths: player.strengths,
        weaknesses: player.weaknesses,
      },
      seasonStats,
      ...(sport === "SOCCER"
        ? {
            intelligence: toBriefIntelligenceSnapshot(
              adaptSoccerIntelligenceProfile(buildSoccerIntelligenceProfile(player))
            ),
          }
        : sport === "BASKETBALL"
          ? {
              intelligence: toBriefIntelligenceSnapshot(
                buildBasketballIntelligenceProfile(player)
              ),
            }
          : sport === "AMERICAN_FOOTBALL"
            ? {
                intelligence: toBriefIntelligenceSnapshot(
                  buildAmericanFootballIntelligenceProfile(player)
                ),
              }
            : {}),
    },
    null,
    2
  );
}

function parseLlmPayload(content: string): LlmReportPayload | null {
  try {
    const trimmed = content.trim();
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as LlmReportPayload;
  } catch {
    return null;
  }
}

function withServerRating(text: string | undefined, rating: number, fallback: string): string {
  const source = text?.trim() ? text : fallback;
  return alignNarrativeWithServerRating(source, rating);
}

async function generateWithOpenRouter(
  player: Player,
  userPrompt: string
): Promise<ScoutingReport | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const fallbackFit = resolveTacticalFit(player);
  const systemPrompt = resolveSystemPrompt(player);
  const model = resolveOpenRouterModel();

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Football Intelligence Platform",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    console.warn("[openrouter] API error:", response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const payload = parseLlmPayload(content);
  if (!payload?.summary || !payload.recommendation) return null;

  const fallbackStyle = derivePlayingStyle(player);
  // Always use unified sport rating — do not trust a parallel LLM score.
  const rating = computeOverallRating(player);

  return withBriefContext(
    {
      id: `report-${player.id}-${Date.now()}`,
      playerId: player.id,
      summary: withServerRating(payload.summary, rating, ""),
      strengths: (payload.strengths?.length ? payload.strengths : player.strengths).map((line) =>
        alignNarrativeWithServerRating(line, rating)
      ),
      weaknesses: (payload.weaknesses?.length ? payload.weaknesses : player.weaknesses).map((line) =>
        alignNarrativeWithServerRating(line, rating)
      ),
      playingStyle: {
        label: payload.playingStyle?.label ?? fallbackStyle.label,
        description: withServerRating(
          payload.playingStyle?.description,
          rating,
          fallbackStyle.description
        ),
        traits: (payload.playingStyle?.traits?.length
          ? payload.playingStyle.traits
          : fallbackStyle.traits
        ).map((line) => alignNarrativeWithServerRating(line, rating)),
      },
      tacticalFit: {
        systems: payload.tacticalFit?.systems?.length
          ? payload.tacticalFit.systems
          : fallbackFit.systems,
        roles: payload.tacticalFit?.roles?.length ? payload.tacticalFit.roles : fallbackFit.roles,
        narrative: withServerRating(payload.tacticalFit?.narrative, rating, fallbackFit.narrative),
      },
      recommendation: withServerRating(payload.recommendation, rating, ""),
      overallRating: rating,
      generatedBy: model,
      createdAt: new Date().toISOString(),
    },
    player
  );
}

export async function generateScoutingReport(player: Player): Promise<ScoutingReport> {
  let percentiles: ScoutPercentilePrompt | null = null;
  if (playerSport(player) === "SOCCER") {
    try {
      percentiles = await resolveSoccerPercentilePrompt(player);
    } catch (error) {
      console.warn("[scout-report] percentile table unavailable:", error);
      percentiles = { available: false, cohortSize: 0 };
    }
  }

  try {
    const llmReport = await generateWithOpenRouter(player, buildScoutUserPrompt(player, percentiles));
    if (llmReport) return llmReport;
  } catch (error) {
    console.warn("[openrouter] Failed to generate report:", error);
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return buildMockReport(player);
}
