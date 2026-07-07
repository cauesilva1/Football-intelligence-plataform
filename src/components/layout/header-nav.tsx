"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/scouting", label: "Leagues" },
  { href: "/teams", label: "Clubs" },
  { href: "/tournaments", label: "Tournaments" },
] as const;

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1">
      {NAV_LINKS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
