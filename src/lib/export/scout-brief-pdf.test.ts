import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScoutBriefPdf } from "@/lib/export/scout-brief-pdf";

describe("buildScoutBriefPdf", () => {
  it("returns a PDF blob with core sections", async () => {
    const blob = buildScoutBriefPdf({
      playerName: "Jane Doe",
      position: "CB",
      club: "FC Test",
      age: 24,
      rating: 7.2,
      minutes: 1200,
      appearances: 14,
      smallSample: false,
      summary: "Solid defender with good aerial presence.",
      strengths: ["Aerial duels", "Positioning"],
      risks: ["Pace in transition"],
      recommendation: "Monitor for January window.",
      keyRates: ["Tackles / 90: 2.10", "Interceptions / 90: 1.40"],
      intelligence: {
        role: "Ball-winning Centre-back",
        trajectory: "stable",
        dimensions: [
          { label: "Defense", score: 78 },
          { label: "Creation", score: 42 },
        ],
        limitations: ["Trajectory needs at least two seasons with meaningful minutes."],
      },
    });

    assert.equal(blob.type, "application/pdf");
    const text = await blob.text();
    assert.match(text, /SCOUT BRIEF/);
    assert.match(text, /Jane Doe/);
    assert.match(text, /KEY RATES/);
    assert.match(text, /INTELLIGENCE/);
    assert.match(text, /RECOMMENDATION/);
  });
});
