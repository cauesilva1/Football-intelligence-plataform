/**
 * Multi-page scout brief PDF. Helvetica uses WinAnsi, so Latin-1 letters and the
 * Windows-1252 punctuation (dashes, bullets, quotes) are written as octal bytes.
 * Coordinates stay inside the letter page.
 */

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 54;
const TOP = 742;
const BOTTOM = 56;

/** Unicode points that WinAnsi does not share with Latin-1. */
const WINANSI_EXTRA: Record<string, number> = {
  "\u20ac": 0x80,
  "\u201a": 0x82,
  "\u0192": 0x83,
  "\u201e": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02c6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017d": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02dc": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203a": 0x9b,
  "\u0153": 0x9c,
  "\u017e": 0x9e,
  "\u0178": 0x9f,
};

function winAnsiByte(char: string): number | null {
  const code = char.charCodeAt(0);
  if (code >= 0x20 && code <= 0x7e) return code;
  if (code >= 0xa0 && code <= 0xff) return code;
  return WINANSI_EXTRA[char] ?? null;
}

/** Keep glyphs Helvetica can draw. Unmappable characters fold to ASCII, then drop. */
function foldForPdf(text: string): string {
  let out = "";
  for (const char of text) {
    if (winAnsiByte(char) != null) {
      out += char;
      continue;
    }
    const folded = char.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    for (const piece of folded) {
      if (winAnsiByte(piece) != null) out += piece;
    }
  }
  return out;
}

function escapePdf(text: string): string {
  let out = "";
  for (const char of foldForPdf(text)) {
    const byte = winAnsiByte(char);
    if (byte == null) continue;
    if (byte === 0x5c) out += "\\\\";
    else if (byte === 0x28) out += "\\(";
    else if (byte === 0x29) out += "\\)";
    else if (byte >= 0x20 && byte <= 0x7e) out += String.fromCharCode(byte);
    else out += `\\${byte.toString(8).padStart(3, "0")}`;
  }
  return out;
}

function wrapLine(text: string, max: number): string[] {
  const words = foldForPdf(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const chunks = word.length > max ? word.match(new RegExp(`.{1,${max}}`, "g")) ?? [word] : [word];
    for (const chunk of chunks) {
      const next = current ? `${current} ${chunk}` : chunk;
      if (next.length > max) {
        if (current) lines.push(current);
        current = chunk;
      } else {
        current = next;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export type ScoutBriefPdfInput = {
  playerName: string;
  position: string;
  club: string;
  age?: number;
  rating: number;
  minutes: number;
  appearances?: number;
  smallSample?: boolean;
  sampleNote?: string;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: string;
  keyRates: string[];
  intelligence?: {
    role: string;
    trajectory: string;
    dimensions: { label: string; score: number }[];
    limitations: string[];
  };
};

type PdfLine = { text: string; size: number; bold: boolean; gapAfter: number };

function pushWrapped(
  lines: PdfLine[],
  text: string,
  size: number,
  bold: boolean,
  width: number,
  gapAfter = 4
): void {
  const parts = wrapLine(text, width);
  parts.forEach((part, index) => {
    lines.push({
      text: part,
      size,
      bold,
      gapAfter: index === parts.length - 1 ? gapAfter : 3,
    });
  });
}

export function buildScoutBriefPdf(input: ScoutBriefPdfInput): Blob {
  const lines: PdfLine[] = [];
  const bodyWidth = 92;

  pushWrapped(lines, "OMNISCOUT", 11, true, 40, 2);
  pushWrapped(lines, "SCOUT BRIEF", 18, true, 40, 8);
  pushWrapped(
    lines,
    `${input.playerName}  |  ${input.position}  |  ${input.club}${
      input.age != null ? `  |  Age ${input.age}` : ""
    }`,
    11,
    true,
    78,
    4
  );
  pushWrapped(
    lines,
    `Rating ${input.rating.toFixed(1)}${
      input.minutes > 0 ? `   Minutes ${input.minutes.toLocaleString("en-US")}` : ""
    }${input.appearances != null ? `   Appearances ${input.appearances}` : ""}${
      input.smallSample ? "   Provisional (small sample)" : ""
    }`,
    10,
    false,
    bodyWidth,
    4
  );
  if (input.sampleNote) pushWrapped(lines, input.sampleNote, 9, false, bodyWidth, 8);
  else lines.push({ text: "", size: 8, bold: false, gapAfter: 6 });

  const section = (title: string) => {
    lines.push({ text: "", size: 6, bold: false, gapAfter: 4 });
    pushWrapped(lines, title, 11, true, 40, 6);
  };

  section("SUMMARY");
  pushWrapped(lines, input.summary || "-", 10, false, bodyWidth, 2);
  section("STRENGTHS");
  const strengths = input.strengths.slice(0, 5);
  for (const item of strengths.length > 0 ? strengths : ["-"]) {
    pushWrapped(lines, `- ${item}`, 10, false, bodyWidth, 2);
  }
  section("RISKS");
  const risks = input.risks.slice(0, 4);
  for (const item of risks.length > 0 ? risks : ["-"]) {
    pushWrapped(lines, `- ${item}`, 10, false, bodyWidth, 2);
  }
  section("KEY RATES");
  const rates = input.keyRates.slice(0, 8);
  for (const item of rates.length > 0 ? rates : ["-"]) {
    pushWrapped(lines, `- ${item}`, 10, false, bodyWidth, 2);
  }
  if (input.intelligence) {
    section("INTELLIGENCE");
    pushWrapped(
      lines,
      `Role: ${input.intelligence.role}    Trajectory: ${input.intelligence.trajectory}`,
      10,
      false,
      bodyWidth,
      3
    );
    for (const dimension of input.intelligence.dimensions.slice(0, 4)) {
      pushWrapped(lines, `- ${dimension.label}: ${dimension.score}/100`, 10, false, bodyWidth, 2);
    }
    for (const limitation of input.intelligence.limitations.slice(0, 2)) {
      pushWrapped(lines, `- ${limitation}`, 10, false, bodyWidth, 2);
    }
  }
  section("RECOMMENDATION");
  pushWrapped(lines, input.recommendation || "-", 10, false, bodyWidth, 8);
  pushWrapped(
    lines,
    "OmniScout scout brief. The overall rating is computed on the server. See /methodology.",
    8,
    false,
    100,
    2
  );

  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = TOP;
  for (const line of lines) {
    const nextY = y - line.size - line.gapAfter;
    if (nextY < BOTTOM && current.length > 0) {
      pages.push(current);
      current = [];
      y = TOP;
    }
    current.push(line);
    y -= line.size + line.gapAfter;
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);

  const pageStreams = pages.map((pageLines, pageIndex) => {
    const stream: string[] = ["BT"];
    let cursor = TOP;
    for (const line of pageLines) {
      const font = line.bold ? "/F2" : "/F1";
      stream.push(`${font} ${line.size} Tf`);
      stream.push(`1 0 0 1 ${MARGIN_X} ${cursor} Tm`);
      if (line.text) stream.push(`(${escapePdf(line.text)}) Tj`);
      cursor -= line.size + line.gapAfter;
    }
    stream.push("ET");
    stream.push("BT");
    stream.push("/F1 8 Tf");
    stream.push(`1 0 0 1 ${MARGIN_X} 36 Tm`);
    stream.push(`(${escapePdf(`Page ${pageIndex + 1} of ${pages.length}`)}) Tj`);
    stream.push("ET");
    return stream.join("\n");
  });

  return encodePdf(renumber(pageStreams));
}

function renumber(pageStreams: string[]): string[] {
  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const kids = pageStreams.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageStreams.length} >>\nendobj\n`
  );
  const fontRegularId = 3 + pageStreams.length * 2;
  const fontBoldId = fontRegularId + 1;
  pageStreams.forEach((body, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>\nendobj\n`
    );
    const length = new TextEncoder().encode(body).length;
    objects.push(
      `${contentId} 0 obj\n<< /Length ${length} >>\nstream\n${body}\nendstream\nendobj\n`
    );
  });
  objects.push(
    `${fontRegularId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`
  );
  objects.push(
    `${fontBoldId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`
  );
  return objects;
}

function encodePdf(objects: string[]): Blob {
  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(encoder.encode(pdf).length);
    pdf += obj;
  }
  const xrefStart = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
