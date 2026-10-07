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

describe("seeded insights", () => {
  it("publishes a single coming-soon edition", () => {
    const editions = loadInsights();
    assert.equal(editions.length, 1);
    assert.equal(editions[0]?.slug, "coming-soon");
    assert.equal(editions[0]?.title, "Coming soon");
    assert.equal(editions[0]?.date, "2026-10-06");
    assert.equal(
      editions[0]?.excerpt,
      "A biweekly sports-analytics letter. Each edition asks one question and answers it with the data and one chart."
    );
  });
});
