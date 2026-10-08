import Link from "next/link";
import { APP_NAME } from "@/lib/config";

/** Shared chrome for every Insights edition. No sport switcher and no sport theme. */
export function InsightsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="font-display text-lg font-bold tracking-tight text-foreground">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Insights">
            <Link href="/insights" className="font-medium text-foreground">
              Insights
            </Link>
            <Link href="/scouting" className="text-muted-foreground hover:text-foreground">
              Desk
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
          <span>
            <Link href="/insights" className="hover:text-foreground">
              Insights
            </Link>
            {" · "}
            <Link href="/methodology" className="hover:text-foreground">
              Methodology
            </Link>
          </span>
          <span>{APP_NAME}</span>
        </div>
      </footer>
    </div>
  );
}
