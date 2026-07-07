"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/config";
import { NAV_ITEMS, SidebarLogo } from "./mobile-nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-background/60 px-3 py-5 md:flex">
      <SidebarLogo />

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-[11px] font-medium text-muted-foreground">Temporada ativa</p>
        <p className="font-display text-sm font-semibold text-primary">{appConfig.season}</p>
      </div>
    </aside>
  );
}
