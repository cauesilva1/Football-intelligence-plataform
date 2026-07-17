"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSport } from "@/context/sport-context";
import { SportSwitcher } from "./sport-switcher";
import { NAV_GROUPS, SidebarLogo, navLabel, type NavItem } from "./mobile-nav";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { currentSport } = useSport();
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "opacity-70")} />
      <span className="truncate">{navLabel(item, currentSport)}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-background/50 px-4 py-6 backdrop-blur-md md:flex">
      <SidebarLogo />

      <div className="mb-8">
        <SportSwitcher />
      </div>

      <nav className="flex flex-1 flex-col gap-8 overflow-y-auto pr-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="space-y-1.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return <NavLink key={item.href} item={item} active={Boolean(active)} />;
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
