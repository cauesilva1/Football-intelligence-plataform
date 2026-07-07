import fs from "fs";
import csv from "csv-parser";
import { resolveCsvPath } from "@/etl/paths";
import { getMappingSummary, transformCsvRow } from "@/etl/transform/transformer";

export interface ReadCsvOptions {
  limit?: number;
  filePath?: string;
}

/**
 * Streams the players CSV and yields transformed records.
 * Stops after `limit` rows when provided.
 */
export async function readAndTransformCsv(
  options: ReadCsvOptions = {}
): Promise<ReturnType<typeof transformCsvRow>[]> {
  const filePath = options.filePath ?? resolveCsvPath();
  const limit = options.limit ?? Infinity;

  return new Promise((resolve, reject) => {
    const results: ReturnType<typeof transformCsvRow>[] = [];
    let rowCount = 0;

    const stream = fs.createReadStream(filePath).pipe(csv());

    stream
      .on("data", (row: Record<string, string>) => {
        if (rowCount >= limit) {
          stream.destroy();
          return;
        }

        results.push(transformCsvRow(row));
        rowCount += 1;
      })
      .on("close", () => resolve(results))
      .on("error", reject);
  });
}

async function validateMappingSample(limit = 10): Promise<void> {
  const filePath = resolveCsvPath();

  console.log("═".repeat(72));
  console.log("ETL — Validação de mapeamento (amostra)");
  console.log("═".repeat(72));
  console.log(`Arquivo: ${filePath}`);
  console.log(`Linhas:  ${limit}`);
  console.log("\nDicionário playerMapping → colunas CSV:");
  console.table(getMappingSummary());
  console.log("─".repeat(72));

  const records = await readAndTransformCsv({ filePath, limit });

  records.forEach((record, index) => {
    console.log(`\n[${index + 1}] ${record.source.player} · ${record.source.squad}`);
    console.log(`    Pos CSV: ${record.source.position} → ${record.player.position}${record.player.secondaryPosition ? ` / ${record.player.secondaryPosition}` : ""}`);
    console.log(`    External key: ${record.externalKey}`);
    console.log("    Estatísticas transformadas:");
    console.log(
      JSON.stringify(
        {
          appearances: record.statistic.appearances,
          minutesPlayed: record.statistic.minutesPlayed,
          goals: record.statistic.goals,
          assists: record.statistic.assists,
          xG: record.statistic.xG,
          shots: record.statistic.shots,
          shotsOnTarget: record.statistic.shotsOnTarget,
          tacklesWon: record.statistic.tacklesWon,
          interceptions: record.statistic.interceptions,
          yellowCards: record.statistic.yellowCards,
          redCards: record.statistic.redCards,
        },
        null,
        2
      )
    );
    console.log("    Objeto completo:");
    console.log(JSON.stringify(record, null, 2));
  });

  console.log("\n" + "═".repeat(72));
  console.log(`✓ ${records.length} registros transformados com sucesso.`);
  console.log("Aguardando validação antes da carga completa no banco.");
  console.log("═".repeat(72));
}

async function main(): Promise<void> {
  await validateMappingSample(10);
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("/src/etl/extract/csv-reader.ts");

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error("Falha na validação ETL:", error);
    process.exit(1);
  });
}
