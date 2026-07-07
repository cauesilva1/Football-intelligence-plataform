import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth/session";
import { RankingsHub } from "@/features/rankings/components/rankings-hub";

export const metadata = { title: "Rankings · Football Intelligence Platform" };

export default async function RankingsPage() {
  const session = await getSession();

  return (
    <DashboardShell subtitle="Rankings" userName={session?.name}>
      <div className="space-y-6">
        <PageHeader
          title="Rankings curados"
          description="Listas pré-configuradas para scouting rápido por perfil de jogador."
        />
        <RankingsHub />
      </div>
    </DashboardShell>
  );
}
