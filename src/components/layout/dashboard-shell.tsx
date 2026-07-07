import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function DashboardShell({
  children,
  subtitle,
  userName,
}: {
  children: React.ReactNode;
  subtitle?: string;
  userName?: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header subtitle={subtitle} userName={userName} />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
