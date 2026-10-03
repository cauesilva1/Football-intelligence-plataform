/**
 * Structured (one JSON object per line) cron diagnostics.
 * Search Vercel logs for `"scope":"cron-soccer"`. Never pass secrets in `fields`.
 */

type LogValue = string | number | boolean | null | undefined;
export type CronLogFields = Record<string, LogValue>;

type ActiveRun = { scope: string; startedAt: number; budgetMs: number };

let activeRun: ActiveRun | null = null;

export function startCronRun(scope: string, budgetMs: number, now = Date.now()): void {
  activeRun = { scope, startedAt: now, budgetMs };
}

export function endCronRun(): void {
  activeRun = null;
}

export function cronBudgetSnapshot(now = Date.now()): { elapsedMs: number; remainingMs: number } | null {
  if (!activeRun) return null;
  const elapsedMs = now - activeRun.startedAt;
  return { elapsedMs, remainingMs: activeRun.budgetMs - elapsedMs };
}

const SECRET_FIELD = /key|token|secret|authorization|password/i;

export function formatCronLogLine(
  scope: string,
  event: string,
  fields: CronLogFields = {},
  budget: { elapsedMs: number; remainingMs: number } | null = null
): string {
  const safe: Record<string, LogValue> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    safe[name] = SECRET_FIELD.test(name) ? "[redacted]" : value;
  }
  return JSON.stringify({ scope, event, ...budget, ...safe });
}

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/(api[_-]?key|token|secret)=[^&\s]+/gi, "$1=[redacted]").slice(0, 300);
}

export function logCron(
  event: string,
  fields: CronLogFields = {},
  level: "log" | "warn" = "log"
): void {
  const scope = activeRun?.scope ?? "cron";
  console[level](formatCronLogLine(scope, event, fields, cronBudgetSnapshot()));
}
