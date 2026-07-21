"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSport } from "@/context/sport-context";
import { NAV_GROUPS, navLabel } from "./mobile-nav";

export function MobileHeaderMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { currentSport } = useSport();

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-full z-[60] mt-2 max-h-[70vh] w-64 space-y-4 overflow-y-auto rounded-xl border border-border bg-background p-3 shadow-panel">
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className="space-y-1">
                <p className="px-3 text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/12 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-70" />
                      {navLabel(item, currentSport)}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </>
      ) : null}
    </div>
  );
}
