import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import "@/app/landing.css";

const TICKER = [
  { href: "/scouting?desk=soccer", label: "Soccer" },
  { href: "/scouting?desk=basketball", label: "Basketball" },
  { href: "/scouting?desk=football", label: "Football" },
  { href: "/scouting?desk=hockey", label: "Hockey" },
  { href: "/recruitment?desk=soccer", label: "Recruitment" },
  { href: "/compare?desk=soccer", label: "Compare" },
  { href: "/methodology", label: "Methodology" },
  { href: "/insights", label: "Insights" },
] as const;

const ACCESS_MAIL = "mailto:access@omniscout.app?subject=OmniScout%20access%20request";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-wrap landing-header-inner">
          <Link href="/" className="landing-logo">
            <i aria-hidden />
            {APP_NAME}
          </Link>
          <nav className="landing-ticker" aria-label="Sections">
            {TICKER.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="landing-header-actions">
            <Link href="/scouting?desk=soccer" className="landing-btn landing-btn-quiet">
              Desk
            </Link>
            <a href={ACCESS_MAIL} className="landing-btn landing-btn-primary">
              Contact
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
              Multi-sport scouting intelligence for soccer, basketball, football, and hockey.
              Honest sample limits. Not a live Opta feed.
            </p>
          </div>
          <div className="landing-footer-col">
            <p>Desk</p>
            <Link href="/scouting?desk=soccer">Scouting</Link>
            <Link href="/recruitment?desk=soccer">Recruitment</Link>
            <Link href="/compare?desk=soccer">Compare</Link>
            <Link href="/shortlist?desk=soccer">Shortlist</Link>
            <Link href="/insights">Insights</Link>
          </div>
          <div className="landing-footer-col">
            <p>Trust</p>
            <Link href="/methodology">Methodology</Link>
            <a href={ACCESS_MAIL}>Get in touch</a>
          </div>
        </div>
        <div className="landing-wrap landing-footer-bottom">
          <span>
            © {new Date().getFullYear()} {APP_NAME}
          </span>
          <span>Sports intelligence</span>
        </div>
      </footer>
    </div>
  );
}
