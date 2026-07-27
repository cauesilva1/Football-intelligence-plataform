import Link from "next/link";
import {
  AmericanFootballIcon,
  BasketballIcon,
  SoccerBallIcon,
} from "@/components/icons/sport-balls";
import { APP_NAME } from "@/lib/config";

const NAV = [
  { href: "/scouting", label: "Scouting" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/methodology", label: "Methodology" },
] as const;

const ACCESS_MAIL = "mailto:access@omniscout.app?subject=OmniScout%20access%20request";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-wrap landing-header-inner">
          <Link href="/" className="landing-logo">
            <span className="landing-logo-marks" aria-hidden>
              <span className="landing-logo-mark" data-landing-sport="SOCCER">
                <SoccerBallIcon className="h-3.5 w-3.5" />
              </span>
              <span className="landing-logo-mark" data-landing-sport="BASKETBALL">
                <BasketballIcon className="h-3.5 w-3.5" />
              </span>
              <span className="landing-logo-mark" data-landing-sport="AMERICAN_FOOTBALL">
                <AmericanFootballIcon className="h-3.5 w-3.5" />
              </span>
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <nav className="landing-nav">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="landing-header-actions">
            <Link href="/dashboard" className="landing-btn-nav">
              Explore the product
            </Link>
            <a href={ACCESS_MAIL} className="landing-btn-primary landing-btn-compact">
              Get in touch
            </a>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-grid">
          <div>
            <p className="landing-footer-brand">{APP_NAME}</p>
            <p className="landing-footer-copy">
              Multi-sport decision layer for scouts — soccer, basketball, and American football.
              Explainable intelligence on season data. Not a live Opta feed.
            </p>
          </div>
          <div className="landing-footer-col">
            <p>Scouting</p>
            <Link href="/scouting">Scouting</Link>
            <Link href="/recruitment">Recruitment</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
          <div className="landing-footer-col">
            <p>Trust</p>
            <Link href="/methodology">Methodology</Link>
            <a href={ACCESS_MAIL}>Get in touch</a>
          </div>
        </div>
        <div className="landing-wrap landing-footer-bottom">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <span>Prototype · honest sample limits</span>
        </div>
      </footer>
    </div>
  );
}
