import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alignNarrativeWithServerRating,
  buildScoutUserPrompt,
  OPENROUTER_REASONING,
  resolveOpenRouterModel,
  scoutFallbackAttribution,
  type ScoutPercentilePrompt,
} from "@/lib/ai/scout-report-generator";
import type { Player, PlayerStatistic } from "@/types";

function stat(overrides: Partial<PlayerStatistic> = {}): PlayerStatistic {
  return {
    id: "s1",
    playerId: "p1",
    teamId: "t1",
    season: "2025/26",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: 1600,
    goals: 8,
    assists: 3,
    xG: 0,
    xA: 0,
    shots: 30,
    shotsOnTarget: 12,
    passes: 400,
    passAccuracy: 82,
    keyPasses: 20,
    dribblesCompleted: 18,
    tacklesWon: 12,
    interceptions: 6,
    duelsWonPct: 52,
    yellowCards: 2,
    redCards: 0,
    rating: 7.1,
    per90: {
      goals: 0.45,
      assists: 0.17,
      shots: 1.7,
      keyPasses: 1.1,
      dribbles: 1,
      tackles: 0.7,
      interceptions: 0.3,
    },
    ...overrides,
  };
}

function player(currentSeasonStats: PlayerStatistic): Player {
  return {
    id: "p1",
    fullName: "Test Forward",
    knownAs: "Test",
    dateOfBirth: "2000-01-01",
    age: 25,
    nationality: "BR",
    position: "ST",
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    marketValue: 5_000_000,
    sport: "SOCCER",
    league: "Test League",
    teamId: "t1",
    teamName: "Test FC",
    strengths: ["Finishing"],
    weaknesses: ["Pressing"],
    currentSeasonStats,
    availableSeasons: ["2025/26"],
    selectedSeason: "2025/26",
    history: [currentSeasonStats],
  };
}

const table: ScoutPercentilePrompt = {
  available: true,
  cohortSize: 24,
  league: "Test League",
  position: "ST",
  season: "2025/26",
  rows: [
    { label: "Production (per-90 composite)", percentile: 81 },
    { label: "Creation (per-90 composite)", percentile: 44 },
  ],
};

describe("buildScoutUserPrompt", () => {
  it("includes the per-90 percentile table when the cohort is at least 8", () => {
    const prompt = buildScoutUserPrompt(player(stat({ xG: 6.2, xA: 2.1 })), table);
    assert.match(prompt, /PER-90 LEAGUE PERCENTILES/);
    assert.match(prompt, /Cohort 24 \(minimum 8\)/);
    assert.match(prompt, /Production \(per-90 composite\): 81/);
    assert.match(prompt, /"xG": 6.2/);
    assert.match(prompt, /serverOverallRating/);
  });

  it("tells the model to omit xG and percentiles when they are not measured", () => {
    const prompt = buildScoutUserPrompt(player(stat()), {
      available: false,
      cohortSize: 3,
    });
    assert.match(prompt, /not measured/);
    assert.doesNotMatch(prompt, /"xG":/);
    assert.match(prompt, /Unavailable \(cohort 3, minimum 8\)/);
    assert.match(prompt, /Do not invent them/);
    assert.match(prompt, /omit xG and xA/);
  });
});

describe("scoutFallbackAttribution", () => {
  it("names the failure instead of a mock model", () => {
    const label = scoutFallbackAttribution("OpenRouter HTTP 404");
    assert.match(label, /heuristic fallback/);
    assert.match(label, /OpenRouter HTTP 404/);
    assert.doesNotMatch(label, /mock-ai/);
  });
});

describe("OPENROUTER_REASONING", () => {
  it("turns reasoning off so the brief is not spent on a hidden chain of thought", () => {
    assert.equal(OPENROUTER_REASONING.effort, "none");
  });
});

describe("resolveOpenRouterModel", () => {
  it("defaults to the current free model and honors OPENROUTER_MODEL", () => {
    assert.equal(resolveOpenRouterModel({}), "qwen/qwen3.8-27b:free");
    assert.equal(
      resolveOpenRouterModel({ OPENROUTER_MODEL: " custom/model:free " }),
      "custom/model:free"
    );
  });
});

describe("alignNarrativeWithServerRating", () => {
  it("replaces a contradictory overall rating with the server rating", () => {
    const aligned = alignNarrativeWithServerRating(
      "The overall rating of 9.4 overstates the sample.",
      6.8
    );
    assert.match(aligned, /overall rating of 6.8/);
    assert.doesNotMatch(aligned, /9\.4/);
  });
});
