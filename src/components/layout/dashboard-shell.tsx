"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { PrototypeBanner } from "@/components/common/prototype-banner";
import { useSport } from "@/context/sport-context";
import { cn } from "@/lib/utils";

export function DashboardShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <DashboardShellInner subtitle={subtitle}>{children}</DashboardShellInner>
  );
}

function sportModeClass(sport: string): string {
  if (sport === "BASKETBALL") return "sport-mode-hoops";
  if (sport === "AMERICAN_FOOTBALL") return "sport-mode-gridiron";
  return "sport-mode-pitch";
}

function DashboardShellInner({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  const { currentSport } = useSport();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "sport-ambient flex h-screen overflow-hidden bg-background text-foreground",
        sportModeClass(currentSport)
      )}
      data-sport-shell={currentSport}
    >
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header subtitle={subtitle} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-6">
          <div key={pathname} className="motion-enter space-y-0">
            <PrototypeBanner />
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
