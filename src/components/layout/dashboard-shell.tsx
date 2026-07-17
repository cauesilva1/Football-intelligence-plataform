"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
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

function DashboardShellInner({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  const { currentSport } = useSport();

  return (
    <div
      className={cn(
        "sport-ambient flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300",
        currentSport === "BASKETBALL" ? "sport-mode-hoops" : "sport-mode-pitch"
      )}
      data-sport-shell={currentSport}
    >
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header subtitle={subtitle} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
