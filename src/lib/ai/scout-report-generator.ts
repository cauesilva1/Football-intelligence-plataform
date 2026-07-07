import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import type { Player, ScoutingReport, TacticalFit } from "@/lib/types";
import { formatMarketValue } from "@/lib/utils";

const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are a professional football scout analyst writing structured scouting reports for a analytics platform.

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
  "recommendation": "string — scouting verdict for recruitment",
  "overallRating": number
}

Use industry-standard analytics language (per 90, xG, xA, rating). overallRating must be between 4.0 and 9.5.`;

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

function computeOverallRating(player: Player): number {
  const s = player.currentSeasonStats;
  return Number(
    (s.rating * 0.6 + Math.min(10, (s.goals + s.assists) / 3) * 0.4).toFixed(1)
  );
}

function buildMockReport(player: Player): ScoutingReport {
  const playingStyle = derivePlayingStyle(player);
  const rating = computeOverallRating(player);

  return {
    id: `report-${player.id}-${Date.now()}`,
    playerId: player.id,
    summary: buildSummary(player),
    strengths: player.strengths,
    weaknesses: player.weaknesses,
    playingStyle: {
      label: playingStyle.label,
      description: playingStyle.description,
      traits: playingStyle.traits,
    },
    tacticalFit: buildTacticalFit(player),
    recommendation: buildRecommendation(rating, player.age),
    overallRating: rating,
    generatedBy: "mock-ai-v2",
    createdAt: new Date().toISOString(),
  };
}

function buildPlayerContext(player: Player): string {
  const s = player.currentSeasonStats;
  const p90 = s.per90;
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
        marketValue: formatMarketValue(player.marketValue),
        strengths: player.strengths,
        weaknesses: player.weaknesses,
      },
      seasonStats: {
        appearances: s.appearances,
        minutesPlayed: s.minutesPlayed,
        goals: s.goals,
        assists: s.assists,
        rating: s.rating,
        xG: s.xG,
        xA: s.xA,
        passAccuracy: s.passAccuracy,
        per90: p90,
      },
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

async function generateWithOpenRouter(player: Player): Promise<ScoutingReport | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Football Intelligence Platform",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a scouting report JSON for this player dataset:\n${buildPlayerContext(player)}`,
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
  const rating = Number(
    Math.min(9.5, Math.max(4, payload.overallRating ?? computeOverallRating(player))).toFixed(1)
  );

  return {
    id: `report-${player.id}-${Date.now()}`,
    playerId: player.id,
    summary: payload.summary,
    strengths: payload.strengths?.length ? payload.strengths : player.strengths,
    weaknesses: payload.weaknesses?.length ? payload.weaknesses : player.weaknesses,
    playingStyle: {
      label: payload.playingStyle?.label ?? fallbackStyle.label,
      description: payload.playingStyle?.description ?? fallbackStyle.description,
      traits: payload.playingStyle?.traits?.length ? payload.playingStyle.traits : fallbackStyle.traits,
    },
    tacticalFit: {
      systems: payload.tacticalFit?.systems?.length
        ? payload.tacticalFit.systems
        : buildTacticalFit(player).systems,
      roles: payload.tacticalFit?.roles?.length ? payload.tacticalFit.roles : buildTacticalFit(player).roles,
      narrative: payload.tacticalFit?.narrative ?? buildTacticalFit(player).narrative,
    },
    recommendation: payload.recommendation,
    overallRating: rating,
    generatedBy: OPENROUTER_MODEL,
    createdAt: new Date().toISOString(),
  };
}

export async function generateScoutingReport(player: Player): Promise<ScoutingReport> {
  try {
    const llmReport = await generateWithOpenRouter(player);
    if (llmReport) return llmReport;
  } catch (error) {
    console.warn("[openrouter] Failed to generate report:", error);
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return buildMockReport(player);
}
