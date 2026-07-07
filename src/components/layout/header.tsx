import { HeaderNav } from "./header-nav";
import { Badge } from "@/components/ui/badge";
import { appConfig } from "@/lib/config";

export function Header({ subtitle }: { userName?: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md md:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-display text-lg font-semibold text-foreground">{subtitle ?? "Overview"}</p>
          {appConfig.dataSource === "mock" && (
            <Badge variant="secondary" className="hidden sm:inline-flex">Demo</Badge>
          )}
          {appConfig.dataSource === "db" && (
            <Badge variant="secondary" className="hidden sm:inline-flex">Supabase</Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {appConfig.name} · Temporada {appConfig.season}
        </p>
      </div>

      <HeaderNav />
    </header>
  );
}
