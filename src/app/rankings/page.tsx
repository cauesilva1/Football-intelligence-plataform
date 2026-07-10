import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { RankingsHub } from "@/features/rankings/components/rankings-hub";

import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Rankings · ${APP_NAME}` };

export default async function RankingsPage() {
  return (
    <DashboardShell subtitle="Rankings">
      <div className="space-y-6">
        <PageHeader
          title="Curated Rankings"
          description="Pre-configured lists for fast scouting by player profile."
        />
        <RankingsHub />
      </div>
    </DashboardShell>
  );
}
