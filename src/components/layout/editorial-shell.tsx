"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, BookOpen } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { useSport } from "@/context/sport-context";
import { sportTheme } from "@/lib/sport-theme";
import { cn } from "@/lib/utils";
import { SportSwitcher } from "./sport-switcher";
import { MobileNav, NAV_GROUPS, navLabel, type NavItem } from "./mobile-nav";
import { MobileHeaderMenu } from "./mobile-header-menu";

const STORAGE_KEY = "omniscout-editorial-sidebar";

function SidebarNavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const { currentSport } = useSport();
  const Icon = item.icon;
  const label = navLabel(item, currentSport);

  return (
    <Link
      href={item.href}
      data-label={label}
      title={collapsed ? label : undefined}
      className={cn("editorial-side-link", active && "is-active", collapsed && "is-collapsed")}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <Icon className="editorial-side-icon" aria-hidden />
      <span className="editorial-side-label">{label}</span>
    </Link>
  );
}

/**
 * Editorial desk shell with a collapsible full sidebar
 * (all Explore + Tools destinations restored).
 */
export function EditorialShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentSport } = useSport();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    // Double rAF: paint restored width first, then enable transitions.
    let outer = 0;
    let inner = 0;
    outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setReady(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, []);

  const toggle = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div
      className={cn("editorial-shell editorial-shell-with-side", ready && "is-ready")}
      data-sport-shell={currentSport}
      data-sidebar={collapsed ? "collapsed" : "expanded"}
    >
      <aside className="editorial-sidebar" aria-label="Desk navigation">
        <div className="editorial-sidebar-top">
          <Link
            href="/"
            className="editorial-brand editorial-brand-side"
            data-label={APP_NAME}
            aria-label={APP_NAME}
            title={collapsed ? APP_NAME : undefined}
          >
            <i aria-hidden />
            <span className="editorial-side-label">{APP_NAME}</span>
          </Link>
          <button
            type="button"
            className="editorial-collapse-btn"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="editorial-sidebar-nav"
            data-label={collapsed ? "Expand" : "Collapse"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden />
            )}
            <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          </button>
        </div>

        <div className="editorial-sidebar-sports">
          <p className="editorial-side-group-label">Sport</p>
          <SportSwitcher layout="grid" />
        </div>

        <nav id="editorial-sidebar-nav" className="editorial-sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="editorial-side-group">
              <p className="editorial-side-group-label">{group.label}</p>
              <div className="editorial-side-group-items">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <SidebarNavLink
                      key={item.href}
                      item={item}
                      active={Boolean(active)}
                      collapsed={collapsed}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="editorial-sidebar-foot">
          <Link
            href="/methodology"
            data-label="Methodology"
            aria-label="Methodology"
            title={collapsed ? "Methodology" : undefined}
            className={cn(
              "editorial-side-link",
              pathname?.startsWith("/methodology") && "is-active",
              collapsed && "is-collapsed"
            )}
          >
            <BookOpen className="editorial-side-icon" aria-hidden />
            <span className="editorial-side-label">Methodology</span>
          </Link>
        </div>
      </aside>

      <div className="editorial-content">
        <header className="editorial-topbar editorial-topbar-compact">
          <div className="editorial-topbar-inner editorial-topbar-inner-flush">
            <p className="editorial-topbar-context">
              <span className="editorial-side-label-always">{APP_NAME}</span>
              <span aria-hidden>·</span>
              <span>{sportTheme(currentSport).label}</span>
            </p>
            <div className="editorial-topbar-end">
              <div className="flex items-center gap-2 md:hidden">
                <SportSwitcher compact />
                <MobileHeaderMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="editorial-main">
          <div key={pathname} className="editorial-canvas motion-enter">
            {children}
          </div>
        </main>

        <footer className="editorial-footer">
          <div className="editorial-footer-inner editorial-footer-inner-flush">
            <span>
              Prototype dataset — models still refining.{" "}
              <Link href="/methodology">Methodology</Link>
            </span>
            <span className="hidden sm:inline">
              {APP_NAME} · {sportTheme(currentSport).label}
            </span>
          </div>
        </footer>
      </div>

      <MobileNav />
    </div>
  );
}
