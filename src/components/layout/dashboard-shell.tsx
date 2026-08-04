"use client";

import { EditorialShell } from "./editorial-shell";

/**
 * Desk pages historically imported DashboardShell (SaaS sidebar).
 * It now delegates to EditorialShell so Explore + Tools share one paper shell.
 * `subtitle` is kept for call-site compatibility; the editorial topbar owns context.
 */
export function DashboardShell({
  children,
  subtitle: _subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <EditorialShell>
      <div className="desk-page">{children}</div>
    </EditorialShell>
  );
}
