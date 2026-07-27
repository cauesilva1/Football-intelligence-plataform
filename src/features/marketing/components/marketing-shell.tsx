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
    <div className="landing min-h-screen bg-[hsl(152_28%_3%)] text-[hsl(140_18%_92%)]">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-5 py-6 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <OmniScoutMark sport="SOCCER" className="h-10 w-10 rounded-md shadow-none" />
            <span className="landing-brand text-[0.95rem] font-bold tracking-[0.04em] text-white">
              {APP_NAME}
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-[0.8rem] font-medium tracking-wide text-white/55 md:flex">
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
          <Link href="/dashboard" className="landing-btn-nav">
            Open app
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/[0.07] px-5 py-12 md:px-10">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="landing-brand text-lg font-bold tracking-tight text-white">{APP_NAME}</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">
              Explainable scouting intelligence. Decision support — not a live Opta feed.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/45">
            <Link href="/methodology" className="transition-colors hover:text-white">
              Methodology
            </Link>
            <Link href="/scouting" className="transition-colors hover:text-white">
              Scouting
            </Link>
            <Link href="/recruitment" className="transition-colors hover:text-white">
              Recruitment
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
