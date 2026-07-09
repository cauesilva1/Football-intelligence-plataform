import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function DashboardShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header subtitle={subtitle} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
