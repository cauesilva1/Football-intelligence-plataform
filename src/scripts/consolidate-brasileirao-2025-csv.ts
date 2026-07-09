/**
 * Consolida blocos FBref (ataque + defesa) de infobrasileirao.txt em CSV unificado.
 * Uso: npx ts-node src/scripts/consolidate-brasileirao-2025-csv.ts
 */
import fs from "fs";
import path from "path";

const INPUT = path.join(process.cwd(), ".data", "infobrasileirao.txt");
const OUTPUT = path.join(process.cwd(), "data", "raw", "brasileirao_players_2025.csv");

const HEADER = "Player,Gls,Ast,Tkl,Int,Cmp%";

const SKIP_LABELS = new Set([
  "Rk",
  "Player",
  "Nation",
  "Pos",
  "Squad",
  "Age",
  "Born",
  "90s",
  "Tkl",
  "TklW",
  "Int",
  "Gls",
  "Ast",
  "MP",
  "Starts",
  "Min",
  "Matches",
  "Squad Stats",
  "Opponent Stats",
]);

interface PlayerRow {
  player: string;
  gls: number;
  ast: number;
  tkl: number;
  int: number;
}

function parseNumber(raw: string): number {
  const normalized = raw.trim().replace(/,/g, "");
  if (!normalized || normalized === "-") return 0;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function isNationLine(line: string): boolean {
  return /^[a-z]{2}[\s\u00a0]+\S+/i.test(line.trim());
}

function isNumericStat(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "-") return false;
  const normalized = trimmed.replace(/,/g, "");
  return /^-?\d+(\.\d+)?$/.test(normalized);
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function findSectionStart(lines: string[], marker: string): number {
  return lines.findIndex((line) => line.includes(marker));
}

function parseAttackSection(lines: string[]): Map<string, PlayerRow> {
  const players = new Map<string, PlayerRow>();

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] !== "Matches") continue;

    let j = i + 1;
    const rank = lines[j]?.trim() ?? "";
    if (!/^\d+$/.test(rank)) continue;
    j += 1;

    const player = lines[j]?.trim() ?? "";
    if (!player || SKIP_LABELS.has(player)) continue;
    j += 1;

    const nation = lines[j]?.trim() ?? "";
    if (!isNationLine(nation)) continue;
    j += 1;

    j += 1; // pos
    j += 1; // squad
    j += 1; // age
    j += 1; // born
    j += 1; // MP
    j += 1; // Starts
    j += 1; // Min
    j += 1; // 90s
    if (j + 1 >= lines.length) continue;

    const gls = parseNumber(lines[j]);
    const ast = parseNumber(lines[j + 1]);

    players.set(player, {
      player,
      gls,
      ast,
      tkl: 0,
      int: 0,
    });
  }

  return players;
}

function parseDefenseSection(lines: string[]): Map<string, Pick<PlayerRow, "tkl" | "int">> {
  const defense = new Map<string, Pick<PlayerRow, "tkl" | "int">>();

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] !== "Matches") continue;

    let j = i + 1;
    const rank = lines[j]?.trim() ?? "";
    if (!/^\d+$/.test(rank)) continue;
    j += 1;

    const player = lines[j]?.trim() ?? "";
    if (!player || SKIP_LABELS.has(player)) continue;
    j += 1;

    const nation = lines[j]?.trim() ?? "";
    if (!isNationLine(nation)) continue;
    j += 1;

    j += 1; // pos
    j += 1; // squad
    j += 1; // age
    j += 1; // born
    j += 1; // 90s

    const stats: number[] = [];
    while (j < lines.length && lines[j] !== "Matches") {
      if (isNumericStat(lines[j])) {
        stats.push(parseNumber(lines[j]));
      }
      j += 1;
    }

    const tkl = stats[0] ?? 0;
    const int = stats.length > 1 ? stats[stats.length - 1] : 0;

    defense.set(player, { tkl, int });
  }

  return defense;
}

function main(): void {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Arquivo de entrada não encontrado: ${INPUT}`);
  }

  const raw = fs.readFileSync(INPUT, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter((line) => line.length > 0);

  const defenseStart = findSectionStart(lines, "Player Defensive Actions");
  const attackStart = findSectionStart(lines, "Player Standard Stats");

  if (defenseStart === -1 || attackStart === -1) {
    throw new Error("Não foi possível localizar os blocos de ataque e defesa no arquivo.");
  }

  const defenseLines = lines.slice(defenseStart, attackStart);
  const attackLines = lines.slice(attackStart);

  const players = parseAttackSection(attackLines);
  const defense = parseDefenseSection(defenseLines);

  for (const [player, stats] of defense) {
    const existing = players.get(player);
    if (existing) {
      existing.tkl = stats.tkl;
      existing.int = stats.int;
      continue;
    }

    players.set(player, {
      player,
      gls: 0,
      ast: 0,
      tkl: stats.tkl,
      int: stats.int,
    });
  }

  const rows = [...players.values()].sort((a, b) =>
    a.player.localeCompare(b.player, "pt-BR", { sensitivity: "base" })
  );

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const csvLines = [
    HEADER,
    ...rows.map(
      (row) =>
        `${escapeCsv(row.player)},${row.gls},${row.ast},${row.tkl},${row.int},0`
    ),
  ];

  fs.writeFileSync(OUTPUT, `${csvLines.join("\n")}\n`, "utf8");

  console.log(
    `[consolidate-br2025] Ataque: ${parseAttackSection(attackLines).size} · Defesa: ${defense.size} · CSV: ${rows.length} jogadores → ${OUTPUT}`
  );
}

main();
