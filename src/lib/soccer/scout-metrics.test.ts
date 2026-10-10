import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoutMetricCopy, scoutPercentile } from "@/lib/soccer/scout-metrics";

describe("scout metric percentiles", () => {
  it("hides a percentile until eight players in the league have the metric", () => {
    assert.equal(scoutPercentile(10, [1, 2, 3, 4, 5, 6, 10]), null);
    assert.equal(scoutPercentile(10, [1, 2, 3, 4, 5, 6, 7, 10]), 94);
  });

  it("keeps an explainer for every metric the view can show", () => {
    assert.match(scoutMetricCopy("xa")?.explainer ?? "", /expected goals/i);
    assert.equal(scoutMetricCopy("not-a-metric"), null);
  });
});
