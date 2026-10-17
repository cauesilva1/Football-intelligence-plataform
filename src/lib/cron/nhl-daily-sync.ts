import { runNhlSync, type NhlSyncResult } from "@/lib/sync/nhl-sync";

const LOG_PREFIX = "[NHL-CRON]";

export async function runNhlDailySync(): Promise<NhlSyncResult> {
  const started = Date.now();
  console.log(`${LOG_PREFIX} start`);
  const result = await runNhlSync({
    maxTeams: 4,
    maxShotGames: 2,
    log: (message) => console.log(`${LOG_PREFIX} ${message}`),
  });
  console.log(`${LOG_PREFIX} done in ${Date.now() - started}ms`, result);
  return result;
}
