import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSeasonLabel } from "@/lib/format/season-label";
import { dashboardSampleFloorLabel } from "@/lib/score-definitions";
import { formatCapHit, formatMarketValue } from "@/lib/utils";

describe("formatSeasonLabel", () => {
  it("expands compact basketball seasons and leaves other labels alone", () => {
    assert.equal(formatSeasonLabel("202627"), "2026/27");
    assert.equal(formatSeasonLabel("202223"), "2022/23");
    assert.equal(formatSeasonLabel("2025/26"), "2025/26");
    assert.equal(formatSeasonLabel("2024"), "2024");
    assert.equal(formatSeasonLabel("202699"), "202699");
  });
});

describe("money formatting", () => {
  it("uses a decimal point for cap hit millions", () => {
    assert.equal(formatCapHit(2_200_000), "$2.2M");
    assert.equal(formatCapHit(1_000_000), "$1M");
    assert.equal(formatCapHit(0), "—");
  });

  it("labels a missing market value in English", () => {
    assert.equal(formatMarketValue(0), "Undisclosed");
    assert.equal(formatMarketValue(2_500_000), "€2.5M");
  });
});

describe("dashboardSampleFloorLabel", () => {
  it("states the sample floor of the active sport", () => {
    assert.match(dashboardSampleFloorLabel("SOCCER"), /450/);
    assert.match(dashboardSampleFloorLabel("BASKETBALL"), /10 G/);
    assert.match(dashboardSampleFloorLabel("AMERICAN_FOOTBALL"), /6 G/);
    assert.doesNotMatch(dashboardSampleFloorLabel("BASKETBALL"), /450/);
  });
});
