import Link from "next/link";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { MarketingShell } from "@/features/marketing/components/marketing-shell";
import {
  LandingHeroPlane,
  LandingSignalStrip,
  LandingSportsStrip,
} from "@/features/marketing/components/landing-hero-plane";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

const landingDisplay = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-landing-display",
  display: "swap",
});

const landingBody = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-body",
  display: "swap",
});

const ACCESS_MAIL = "mailto:access@omniscout.app?subject=OmniScout%20access%20request";

export function LandingPage() {
  return (
    <div className={`${landingDisplay.variable} ${landingBody.variable}`}>
      <MarketingShell>
        <section className="landing-hero">
          <div className="landing-hero-bg" aria-hidden />
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">{APP_TAGLINE}</p>
              <p className="landing-wordmark">{APP_NAME}</p>
              <h1 className="landing-headline">
                In recruitment, decisions start with evidence.
              </h1>
              <p className="landing-lede">
                One scout desk for soccer, basketball, and American football — roles, trajectory,
                fit, and reasons you can defend in a staff room, with sample limits visible.
              </p>
              <div className="landing-cta-row">
                <Link href="/scouting" className="landing-btn-primary">
                  Explore the product
                </Link>
                <a href={ACCESS_MAIL} className="landing-btn-ghost">
                  Get in touch
                </a>
              </div>
            </div>
            <div className="landing-hero-visual">
              <LandingHeroPlane />
            </div>
          </div>
        </section>

        <LandingSignalStrip />
        <LandingSportsStrip />

        <section className="landing-manifesto">
          <div className="landing-wrap">
            <h2 className="landing-manifesto-title">
              Stats feeds are everywhere.
              <span> Explainable decisions aren’t.</span>
            </h2>
            <p className="landing-manifesto-copy">
              Data vendors sell trusted feeds at scale. OmniScout is the multi-sport scout workflow
              on top: shortlist, recruit, compare, and brief — without opaque “overall” scores.
            </p>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-wrap">
            <p className="landing-kicker">How it works</p>
            <h2 className="landing-section-title">
              From raw season lines to a staff-ready recommendation
            </h2>
            <div className="landing-process">
              {[
                {
                  title: "Context",
                  body: "Sport-native season lines, market signals, and cohort context when coverage allows.",
                },
                {
                  title: "Intelligence",
                  body: "Explainable, sport-native profiles — roles, trajectory, and fit on shared rails for every sport.",
                },
                {
                  title: "Decision",
                  body: "Shared shortlist, compare, recruitment, and briefs as decision support across sports.",
                },
              ].map((item, index) => (
                <article key={item.title} className="landing-process-item">
                  <span className="landing-process-index">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-alt">
          <div className="landing-wrap">
            <p className="landing-kicker">Who we power</p>
            <h2 className="landing-section-title">
              Built for desks that need the right athlete — in any sport we cover
            </h2>
            <div className="landing-audiences">
              {[
                {
                  title: "Independent analysts",
                  body: "Run briefs and compare profiles across sports without waiting on an enterprise feed contract.",
                  href: "/scouting",
                  cta: "Open scouting",
                },
                {
                  title: "Clubs & academies",
                  body: "A practical decision layer for smaller rooms — honest about coverage and sample size.",
                  href: "/dashboard",
                  cta: "Open dashboard",
                },
                {
                  title: "Multi-sport workflows",
                  body: "Discover → shortlist → recruit → compare → report, with the sport switcher in the product shell.",
                  href: "/dashboard",
                  cta: "Switch sports in-app",
                },
              ].map((item) => (
                <article key={item.title} className="landing-audience">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <Link href={item.href}>{item.cta} →</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-wrap">
            <p className="landing-kicker">Trust</p>
            <h2 className="landing-section-title">
              When a recruitment room needs the right answer, it needs visible evidence
            </h2>
            <div className="landing-pillars">
              {[
                {
                  title: "Evidence first",
                  body: "Sport-aware metrics with supporting rates — not a black-box overall.",
                },
                {
                  title: "Sample honesty",
                  body: "Provisional ratings and data gaps are shown the way a trusted desk would say them out loud.",
                },
                {
                  title: "Shared scout desk",
                  body: "The same workflow across soccer, basketball, and American football.",
                },
                {
                  title: "Decision support",
                  body: "Ranked fit is a recommendation aid — never sold as certainty.",
                },
              ].map((item) => (
                <article key={item.title} className="landing-pillar">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
            <div className="landing-cta-row landing-cta-row-spaced">
              <Link href="/methodology" className="landing-btn-primary">
                Read the methodology
              </Link>
              <Link href="/scouting" className="landing-btn-ghost">
                See it in the product
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-close">
          <div className="landing-wrap">
            <h2 className="landing-close-title">
              Ready to put evidence on the recruitment table?
            </h2>
            <p className="landing-close-copy">
              No public signup. Explore the multi-sport scout desk, or request a walkthrough.
            </p>
            <div className="landing-cta-row">
              <Link href="/scouting" className="landing-btn-primary">
                Explore the product
              </Link>
              <a href={ACCESS_MAIL} className="landing-btn-ghost">
                Get in touch
              </a>
            </div>
          </div>
        </section>
      </MarketingShell>
    </div>
  );
}
