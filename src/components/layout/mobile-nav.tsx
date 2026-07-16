"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GitCompareArrows,
  Radar,
  ShieldHalf,
  FileText,
  Trophy,
  Bookmark,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/players", label: "Players", icon: Users },
  { href: "/scouting", label: "Scouting", icon: Radar },
  { href: "/rankings", label: "Rankings", icon: BarChart3 },
  { href: "/shortlist", label: "My Players", icon: Bookmark },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/teams", label: "Clubs", icon: ShieldHalf },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function MobileNav() {
  const pathname = usePathname();

  // Keep primary destinations in the bar; full list stays in the header menu.
  const mobileItems = [
    NAV_ITEMS[0], // Overview
    NAV_ITEMS[1], // Players
    NAV_ITEMS[2], // Scouting
    NAV_ITEMS[6], // Clubs
    NAV_ITEMS[7], // Tournaments
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[9px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SidebarLogo() {
  return (
    <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold text-foreground">{APP_NAME}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Multi-Sport</p>
      </div>
    </Link>
  );
}
