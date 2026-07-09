import { HeaderNav } from "./header-nav";
import { MobileHeaderMenu } from "./mobile-header-menu";
import { Badge } from "@/components/ui/badge";
import { appConfig } from "@/lib/config";
import { SidebarLogo } from "./mobile-nav";

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="relative sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:gap-4 md:px-8 md:py-4">
      <div className="flex min-w-0 items-center gap-3 md:gap-4">
        <div className="md:hidden [&_a]:mb-0">
          <SidebarLogo />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-base font-semibold text-foreground md:text-lg">
              {subtitle ?? "Overview"}
            </p>
            {appConfig.dataSource === "mock" && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Demo
              </Badge>
            )}
            {appConfig.dataSource === "db" && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Supabase
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {appConfig.name} · Season {appConfig.season}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden lg:block">
          <HeaderNav />
        </div>
        <MobileHeaderMenu />
      </div>
    </header>
  );
}
