/**
 * Minimal one-page PDF (text-only) — no external deps.
 * Good enough for a scout brief handoff; not a design system.
 */

function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, max = 88): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
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
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: string;
  keyRates: string[];
};

export function buildScoutBriefPdf(input: ScoutBriefPdfInput): Blob {
  const lines: { text: string; size: number }[] = [];
  const push = (text: string, size = 10) => {
    for (const part of wrapLine(text, size >= 14 ? 60 : 90)) {
      lines.push({ text: part, size });
    }
  };

  push("OMNISCOUT — SCOUT BRIEF (1 page)", 14);
  push(
    `${input.playerName}  ·  ${input.position}  ·  ${input.club}${
      input.age != null ? `  ·  Age ${input.age}` : ""
    }`,
    11
  );
  push(
    `Rating ${input.rating.toFixed(1)}${
      input.minutes > 0 ? `  ·  Minutes ${input.minutes.toLocaleString("en-US")}` : ""
    }`,
    11
  );
  push("");
  push("SUMMARY", 12);
  push(input.summary || "—");
  push("");
  push("STRENGTHS", 12);
  for (const s of input.strengths.slice(0, 5)) push(`• ${s}`);
  if (input.strengths.length === 0) push("• —");
  push("");
  push("RISKS", 12);
  for (const r of input.risks.slice(0, 4)) push(`• ${r}`);
  if (input.risks.length === 0) push("• —");
  push("");
  push("KEY RATES", 12);
  for (const k of input.keyRates.slice(0, 6)) push(`• ${k}`);
  if (input.keyRates.length === 0) push("• —");
  push("");
  push("RECOMMENDATION", 12);
  push(input.recommendation || "—");
  push("");
  push("Prototype heuristic rating — see /methodology. Saved brief is device-local export only.", 8);

  let y = 800;
  const stream: string[] = ["BT"];
  for (const line of lines) {
    if (y < 40) break;
    stream.push(`/F1 ${line.size} Tf`);
    stream.push(`1 0 0 1 50 ${y} Tm`);
    stream.push(`(${escapePdf(line.text)}) Tj`);
    y -= line.size + 4;
  }
  stream.push("ET");
  const streamBody = stream.join("\n");
  const streamLen = new TextEncoder().encode(streamBody).length;

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamBody}\nendstream\nendobj\n`);
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

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
