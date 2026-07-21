import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReportGenerator } from "@/features/ai-report/components/report-generator";
import { queryAllPlayersLite } from "@/features/scouting/queries/players";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Scout brief · ${APP_NAME}` };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.playerId;
  const playerId = Array.isArray(raw) ? raw[0] : raw;

  const players = playerId
    ? await queryAllPlayersLite({ take: 1, ensureIds: [playerId] })
    : [];

  const validPlayerId = playerId && players.some((p) => p.id === playerId) ? playerId : undefined;

  return (
    <DashboardShell subtitle="Scout brief">
      <ReportGenerator players={players} initialPlayerId={validPlayerId} />
    </DashboardShell>
  );
}
