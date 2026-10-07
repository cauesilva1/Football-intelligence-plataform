import fs from "node:fs";
import path from "node:path";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export class InsightContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsightContentError";
  }
}

export type InsightChartPoint = { label: string; value: number };

export type InsightBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; alt: string; src: string }
  | { type: "chart"; title: string; caption: string | null; points: InsightChartPoint[] };

export type InsightEdition = {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
  cover: string | null;
  blocks: InsightBlock[];
};

export function insightsContentDir(): string {
  return path.join(process.cwd(), "content", "insights");
}

/** Public https URL for the Substack signup, or null when unset or unsafe. */
export function resolveNewsletterUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url.toString();
}

export function formatInsightDate(isoDate: string): string {
  const parsed = parseIsoDate(isoDate);
  return `${parsed.day} ${MONTHS[parsed.month - 1]} ${parsed.year}`;
}

export function parseInsightDocument(raw: string, filename: string): InsightEdition {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const fence = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fence) {
    throw new InsightContentError(`${filename}: missing frontmatter`);
  }

  const fields = parseFrontmatter(fence[1], filename);
  const slug = requireField(fields, "slug", filename);
  const expectedSlug = filename.replace(/\.md$/, "");
  if (slug !== expectedSlug) {
    throw new InsightContentError(`${filename}: slug "${slug}" must match the file name`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new InsightContentError(`${filename}: slug must be lowercase words separated by hyphens`);
  }

  const date = requireField(fields, "date", filename);
  parseIsoDate(date, filename);

  const cover = fields.cover?.trim() ? assertAssetUrl(fields.cover.trim(), filename, "cover") : null;

  return {
    title: requireField(fields, "title", filename),
    date,
    excerpt: requireField(fields, "excerpt", filename),
    slug,
    cover,
    blocks: parseBlocks(fence[2], filename),
  };
}

export function loadInsights(directory = insightsContentDir()): InsightEdition[] {
  if (!fs.existsSync(directory)) return [];
  const filenames = fs.readdirSync(directory).filter((name) => name.endsWith(".md"));
  const editions = filenames.map((name) => {
    const raw = fs.readFileSync(path.join(directory, name), "utf8");
    return parseInsightDocument(raw, name);
  });
  return editions.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

export function getInsight(slug: string, directory = insightsContentDir()): InsightEdition | null {
  return loadInsights(directory).find((edition) => edition.slug === slug) ?? null;
}

function parseFrontmatter(block: string, filename: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of block.split("\n")) {
    if (!line.trim()) continue;
    const split = line.indexOf(":");
    if (split === -1) {
      throw new InsightContentError(`${filename}: invalid frontmatter line "${line}"`);
    }
    const key = line.slice(0, split).trim();
    let value = line.slice(split + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return fields;
}

function requireField(fields: Record<string, string>, key: string, filename: string): string {
  const value = fields[key]?.trim();
  if (!value) throw new InsightContentError(`${filename}: frontmatter "${key}" is required`);
  return value;
}

function parseIsoDate(isoDate: string, filename = "date"): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new InsightContentError(`${filename}: date must be YYYY-MM-DD`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new InsightContentError(`${filename}: date "${isoDate}" is not a real calendar day`);
  }
  return { year, month, day };
}

function assertAssetUrl(value: string, filename: string, label: string): string {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InsightContentError(`${filename}: ${label} must be a site path or https URL`);
  }
  if (url.protocol !== "https:") {
    throw new InsightContentError(`${filename}: ${label} must be a site path or https URL`);
  }
  return value;
}

function parseBlocks(body: string, filename: string): InsightBlock[] {
  const lines = body.split("\n");
  const blocks: InsightBlock[] = [];
  let paragraph: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) blocks.push({ type: "paragraph", text });
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      const kind = trimmed.slice(3).trim();
      if (kind !== "chart") {
        throw new InsightContentError(`${filename}: only chart fences are supported`);
      }
      const jsonLines: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "```") {
        jsonLines.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) {
        throw new InsightContentError(`${filename}: chart fence is not closed`);
      }
      blocks.push(parseChart(jsonLines.join("\n"), filename));
      index += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (image) {
      flushParagraph();
      blocks.push({
        type: "image",
        alt: image[1],
        src: assertAssetUrl(image[2].trim(), filename, "image"),
      });
      index += 1;
      continue;
    }

    const heading = /^(#{2,3}) (.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2).trim());
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

function parseChart(raw: string, filename: string): InsightBlock {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InsightContentError(`${filename}: chart fence must be JSON`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InsightContentError(`${filename}: chart must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  if (record.type !== undefined && record.type !== "bar") {
    throw new InsightContentError(`${filename}: chart type must be "bar"`);
  }
  if (typeof record.title !== "string" || !record.title.trim()) {
    throw new InsightContentError(`${filename}: chart title is required`);
  }
  if (record.caption !== undefined && typeof record.caption !== "string") {
    throw new InsightContentError(`${filename}: chart caption must be a string`);
  }
  if (!Array.isArray(record.points) || record.points.length < 1 || record.points.length > 12) {
    throw new InsightContentError(`${filename}: chart needs 1 to 12 points`);
  }
  const points = record.points.map((point) => {
    if (!point || typeof point !== "object" || Array.isArray(point)) {
      throw new InsightContentError(`${filename}: each chart point needs a label and value`);
    }
    const row = point as Record<string, unknown>;
    if (typeof row.label !== "string" || !row.label.trim()) {
      throw new InsightContentError(`${filename}: each chart point needs a label`);
    }
    if (typeof row.value !== "number" || !Number.isFinite(row.value)) {
      throw new InsightContentError(`${filename}: each chart point needs a finite value`);
    }
    return { label: row.label.trim(), value: row.value };
  });

  return {
    type: "chart",
    title: record.title.trim(),
    caption: typeof record.caption === "string" && record.caption.trim() ? record.caption.trim() : null,
    points,
  };
}
