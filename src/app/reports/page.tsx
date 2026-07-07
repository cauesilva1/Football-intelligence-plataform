import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReportGenerator } from "@/features/ai-report/components/report-generator";
import { queryAllPlayersLite } from "@/features/scouting/queries/players";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "AI Reports · Football Intelligence Platform" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, players, params] = await Promise.all([
    getSession(),
    queryAllPlayersLite(),
    searchParams,
  ]);

  const raw = params.playerId;
  const playerId = Array.isArray(raw) ? raw[0] : raw;
  const validPlayerId = playerId && players.some((p) => p.id === playerId) ? playerId : undefined;

  return (
    <DashboardShell subtitle="AI Scout Reports" userName={session?.name}>
      <ReportGenerator players={players} initialPlayerId={validPlayerId} />
    </DashboardShell>
  );
}
