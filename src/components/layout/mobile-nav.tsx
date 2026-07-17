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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";
import { useSport } from "@/context/sport-context";
import { sportTheme } from "@/lib/sport-theme";
import { OmniScoutMark } from "@/components/icons/sport-balls";
import { useIsMounted } from "@/hooks/use-is-mounted";
import type { Sport } from "@/lib/sport";

export type NavItem = {
  href: string;
  label: string;
  basketballLabel?: string;
  americanFootballLabel?: string;
  icon: LucideIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Primary destinations + quieter tools group for a cleaner sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "explore",
    label: "Explore",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/players", label: "Players", icon: Users },
      { href: "/scouting", label: "Scouting", icon: Radar },
      {
        href: "/tournaments",
        label: "Tournaments",
        basketballLabel: "Leagues",
        americanFootballLabel: "Leagues",
        icon: Trophy,
      },
      {
        href: "/teams",
        label: "Clubs",
        basketballLabel: "Franchises",
        americanFootballLabel: "Franchises",
        icon: ShieldHalf,
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { href: "/rankings", label: "Rankings", icon: BarChart3 },
      { href: "/shortlist", label: "My Players", icon: Bookmark },
      { href: "/compare", label: "Compare", icon: GitCompareArrows },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function navLabel(item: NavItem, sport: Sport): string {
  if (sport === "BASKETBALL") {
    return item.basketballLabel ?? item.label;
  }
  if (sport === "AMERICAN_FOOTBALL") {
    return item.americanFootballLabel ?? item.basketballLabel ?? item.label;
  }
  return item.label;
}

/** Primary destinations for the mobile bottom bar. */
export function getMobileNavItems() {
  return [
    NAV_ITEMS[0], // Overview
    NAV_ITEMS[1], // Players
    NAV_ITEMS[2], // Scouting
    NAV_ITEMS[3], // Tournaments
    NAV_ITEMS[4], // Clubs
  ];
}

export function MobileNav() {
  const pathname = usePathname();
  const { currentSport } = useSport();
  const mobileItems = getMobileNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
              <span className="truncate">{navLabel(item, currentSport)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SidebarLogo() {
  const { currentSport } = useSport();
  const mounted = useIsMounted();
  // Defer sport-specific chrome until after mount to avoid SSR/cookie hydration mismatch.
  const theme = sportTheme(mounted ? currentSport : "SOCCER");
  const markSport = mounted ? currentSport : "SOCCER";

  return (
    <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-1">
      <OmniScoutMark sport={markSport} />
      <div className="min-w-0 leading-tight">
        <p className="font-display text-[15px] font-bold tracking-tight text-foreground">{APP_NAME}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-primary/70">{theme.tagline}</p>
      </div>
    </Link>
  );
}
