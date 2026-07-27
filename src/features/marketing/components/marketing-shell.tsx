import Link from "next/link";
import { OmniScoutMark } from "@/components/icons/sport-balls";
import { APP_NAME } from "@/lib/config";

const NAV = [
  { href: "/scouting", label: "Scouting" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/methodology", label: "Methodology" },
] as const;

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing min-h-screen bg-[hsl(150_18%_4%)] text-[hsl(140_20%_92%)]">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <Link href="/" className="landing-nav-brand flex items-center gap-2.5">
            <OmniScoutMark sport="SOCCER" className="h-9 w-9 rounded-md" />
            <span className="landing-brand text-sm font-semibold tracking-wide text-white">
              {APP_NAME}
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-white/65 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors duration-300 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/dashboard"
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors duration-300 hover:border-white/30 hover:bg-white/10"
          >
            Open app
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/8 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="landing-brand text-sm font-semibold text-white">{APP_NAME}</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-white/45">
              Decision support for scouts — not a live data feed. Prototype with honest sample
              limits.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-white/50">
            <Link href="/methodology" className="transition-colors hover:text-white">
              Methodology
            </Link>
            <Link href="/scouting" className="transition-colors hover:text-white">
              Scouting
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
