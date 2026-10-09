import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  InsightContentError,
  formatInsightDate,
  getInsight,
  loadInsights,
  parseInsightDocument,
  resolveNewsletterUrl,
} from "@/lib/insights/catalog";
import { isInsightsPath } from "@/lib/sport-theme";

const COMING_SOON = `---
title: Coming soon
date: 2026-10-06
excerpt: A biweekly letter that answers one scouting question with data and one chart.
slug: coming-soon
cover: /insights/coming-soon.svg
---

OmniScout Insights is the archive.

## One question per edition

- The question
- The data
- One chart

![Edition diagram](/insights/coming-soon.svg)

\`\`\`chart
{
  "title": "What one edition holds",
  "caption": "Three parts, not a match dataset.",
  "points": [
    { "label": "Question", "value": 1 },
    { "label": "Data", "value": 1 },
    { "label": "Chart", "value": 1 }
  ]
}
\`\`\`
`;

describe("parseInsightDocument", () => {
  it("reads frontmatter and keeps image and chart blocks", () => {
    const edition = parseInsightDocument(COMING_SOON, "coming-soon.md");
    assert.equal(edition.title, "Coming soon");
    assert.equal(edition.date, "2026-10-06");
    assert.equal(edition.slug, "coming-soon");
    assert.equal(edition.cover, "/insights/coming-soon.svg");
    assert.equal(formatInsightDate(edition.date), "6 Oct 2026");

    const image = edition.blocks.find((block) => block.type === "image");
    assert.ok(image && image.type === "image");
    assert.equal(image.src, "/insights/coming-soon.svg");
    assert.equal(image.alt, "Edition diagram");

    const chart = edition.blocks.find((block) => block.type === "chart");
    assert.ok(chart && chart.type === "chart");
    assert.equal(chart.title, "What one edition holds");
    assert.deepEqual(
      chart.points.map((point) => point.value),
      [1, 1, 1]
    );
  });

  it("rejects a slug that does not match the file name", () => {
    assert.throws(
      () => parseInsightDocument(COMING_SOON, "other.md"),
      (error: unknown) => error instanceof InsightContentError && /slug/.test(error.message)
    );
  });

  it("rejects an image that is not a site path or https URL", () => {
    const raw = COMING_SOON.replace("(/insights/coming-soon.svg)", "(http://evil.example/chart.png)");
    assert.throws(() => parseInsightDocument(raw, "coming-soon.md"), InsightContentError);
  });
});

describe("loadInsights", () => {
  it("returns editions newest first", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "insights-"));
    try {
      fs.writeFileSync(
        path.join(directory, "older.md"),
        "---\ntitle: Older\ndate: 2026-01-15\nexcerpt: First letter.\nslug: older\n---\n\nFirst.\n"
      );
      fs.writeFileSync(
        path.join(directory, "newer.md"),
        "---\ntitle: Newer\ndate: 2026-09-02\nexcerpt: Second letter.\nslug: newer\n---\n\nSecond.\n"
      );
      const editions = loadInsights(directory);
      assert.deepEqual(
        editions.map((edition) => edition.slug),
        ["newer", "older"]
      );
      assert.equal(getInsight("older", directory)?.title, "Older");
      assert.equal(getInsight("missing", directory), null);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("resolveNewsletterUrl", () => {
  it("keeps https links and drops empty or unsafe values", () => {
    assert.equal(
      resolveNewsletterUrl(" https://omniscout.substack.com "),
      "https://omniscout.substack.com/"
    );
    assert.equal(resolveNewsletterUrl(""), null);
    assert.equal(resolveNewsletterUrl("   "), null);
    assert.equal(resolveNewsletterUrl(undefined), null);
    assert.equal(resolveNewsletterUrl("javascript:alert(1)"), null);
    assert.equal(resolveNewsletterUrl("http://omniscout.substack.com"), null);
  });
});

describe("insights routes", () => {
  it("treats the archive and its articles as one section", () => {
    assert.equal(isInsightsPath("/insights"), true);
    assert.equal(isInsightsPath("/insights/coming-soon"), true);
    assert.equal(isInsightsPath("/players"), false);
    assert.equal(isInsightsPath("/insights-archive"), false);
  });
});

describe("seeded insights", () => {
  it("publishes the first edition and drops the coming-soon placeholder", () => {
    const editions = loadInsights();
    assert.equal(editions.length, 1);
    const edition = editions[0];
    assert.equal(edition?.slug, "where-does-a-19-year-old-guard-actually-shoot-from");
    assert.equal(edition?.title, "Where does a 19-year-old guard actually shoot from?");
    assert.equal(edition?.date, "2026-10-07");
    assert.equal(editions.some((item) => item.slug === "coming-soon"), false);
    const chart = edition?.blocks.find((block) => block.type === "shotChart");
    assert.ok(chart && chart.type === "shotChart");
    assert.equal(chart.gameId, "401898716");
    assert.equal(chart.season, "202627");
    const copy = edition?.blocks
      .filter((block) => block.type === "paragraph")
      .map((block) => (block.type === "paragraph" ? block.text : ""))
      .join("\n");
    assert.match(copy ?? "", /One preseason game tracked/);
    assert.match(copy ?? "", /Originally published on Substack/);
    assert.doesNotMatch(copy ?? "", /eight games/i);
  });
});
