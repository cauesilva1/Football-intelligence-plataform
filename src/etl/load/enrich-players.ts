import { CURRENT_SEASON } from "@/lib/data/generators";
import { enrichPlayerRecord } from "@/lib/metrics/player-enrichment";
import { calcAge } from "@/lib/utils";
import { getPrisma } from "@/lib/prisma";

const PROGRESS_INTERVAL = 100;

export async function enrichAllPlayers(): Promise<{ updated: number }> {
  const statistics = await getPrisma().playerStatistic.findMany({
    where: { season: CURRENT_SEASON },
    include: {
      player: {
        select: {
          id: true,
          position: true,
          dateOfBirth: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;

  for (const stat of statistics) {
    const age = calcAge(stat.player.dateOfBirth.toISOString());
    const enriched = enrichPlayerRecord(
      { id: stat.player.id, position: stat.player.position, age },
      {
        minutesPlayed: stat.minutesPlayed,
        goals: stat.goals,
        assists: stat.assists,
        shots: stat.shots,
        shotsOnTarget: stat.shotsOnTarget,
        tacklesWon: stat.tacklesWon,
        interceptions: stat.interceptions,
        yellowCards: stat.yellowCards,
        redCards: stat.redCards,
      }
    );

    await getPrisma().$transaction([
      getPrisma().playerStatistic.update({
        where: { id: stat.id },
        data: {
          rating: enriched.rating,
          xG: enriched.xG,
          xA: enriched.xA,
          keyPasses: enriched.keyPasses,
          passAccuracy: enriched.passAccuracy,
          dribblesCompleted: enriched.dribblesCompleted,
          duelsWonPct: enriched.duelsWonPct,
        },
      }),
      getPrisma().player.update({
        where: { id: stat.player.id },
        data: {
          strengths: enriched.strengths,
          weaknesses: enriched.weaknesses,
          marketValue: enriched.marketValue,
          preferredFoot: enriched.preferredFoot,
        },
      }),
    ]);

    updated += 1;
    if (updated % PROGRESS_INTERVAL === 0) {
      console.log(`Enriquecidos: ${updated} registros...`);
    }
  }

  return { updated };
}

async function main(): Promise<void> {
  console.log("═".repeat(72));
  console.log("ETL — Enriquecimento de jogadores (data patch)");
  console.log("═".repeat(72));
  console.log("Fórmula Rating Proxy: ver src/lib/metrics/player-enrichment.ts → computeRatingProxy()");
  console.log("─".repeat(72));

  const { updated } = await enrichAllPlayers();

  const sample = await getPrisma().player.findFirst({
    where: { fullName: { contains: "Aaronson", mode: "insensitive" } },
    include: { statistics: { where: { season: CURRENT_SEASON } } },
  });

  console.log("─".repeat(72));
  console.log(`Enriquecimento finalizado! Total atualizado: ${updated}`);
  if (sample?.statistics[0]) {
    console.log("\nAmostra (Brenden Aaronson ou similar):");
    console.log(
      JSON.stringify(
        {
          rating: sample.statistics[0].rating,
          xG: sample.statistics[0].xG,
          xA: sample.statistics[0].xA,
          marketValue: sample.marketValue,
          preferredFoot: sample.preferredFoot,
          strengths: sample.strengths,
          weaknesses: sample.weaknesses,
        },
        null,
        2
      )
    );
  }
  console.log("═".repeat(72));
}

main()
  .catch((error: unknown) => {
    console.error("Falha no enriquecimento:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
