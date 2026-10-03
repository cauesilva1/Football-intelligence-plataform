import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatChartNumber,
  formatDisplayNumber,
  formatInputNumber,
} from "@/lib/format/display-number";

describe("formatDisplayNumber", () => {
  it("caps raw floats at two decimals and keeps integers intact", () => {
    assert.equal(formatDisplayNumber(3.869047619047619), "3.87");
    assert.equal(formatDisplayNumber(6.800000190734863, 1), "6.8");
    assert.equal(formatDisplayNumber(10), "10");
    assert.equal(formatDisplayNumber(0), "0");
    assert.equal(formatDisplayNumber(Number.NaN), "—");
  });

  it("formats number inputs and chart values without grouping separators", () => {
    assert.equal(formatInputNumber("6.800000190734863", 1), "6.8");
    assert.equal(formatInputNumber("99999999999", 0), "99999999999");
    assert.equal(formatInputNumber("", 1), "");
    assert.equal(formatChartNumber(3.869047619047619), "3.87");
  });
});
