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
    <div className="landing">
      <header className="landing-header">
        <div className="landing-wrap landing-header-inner">
          <Link href="/" className="landing-logo">
            <OmniScoutMark sport="SOCCER" className="h-8 w-8 rounded-md shadow-none" />
            <span>{APP_NAME}</span>
          </Link>
          <nav className="landing-nav">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
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
      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-inner">
          <div>
            <p className="landing-footer-brand">{APP_NAME}</p>
            <p className="landing-footer-copy">
              Explainable scouting intelligence. Decision support — not a live data feed.
            </p>
          </div>
          <div className="landing-footer-links">
            <Link href="/methodology">Methodology</Link>
            <Link href="/scouting">Scouting</Link>
            <Link href="/recruitment">Recruitment</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
