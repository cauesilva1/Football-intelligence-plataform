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
    const positions = [...text.matchAll(/1 0 0 1 \d+ (\d+) Tm/g)].map((match) =>
      Number(match[1])
    );
    assert.ok(positions.length > 0);
    for (const y of positions) {
      assert.ok(y >= 36 && y <= 750, `text y ${y} is outside the page`);
    }
  });

  it("folds accents and continues onto a second page", async () => {
    const blob = buildScoutBriefPdf({
      playerName: "José",
      position: "RW",
      club: "FC Test",
      rating: 8.1,
      minutes: 2100,
      summary: "Measured output across a full scouting paragraph. ".repeat(120),
      strengths: ["Carrying"],
      risks: ["Press resistance"],
      recommendation: "Sign.",
      keyRates: ["Goals / 90: 0.70"],
    });
    const text = await blob.text();
    assert.match(text, /\/Count 2/);
    assert.match(text, /Jose/);
    assert.doesNotMatch(text, /José/);
    assert.doesNotMatch(text, /Prototype heuristic/);
  });
});
