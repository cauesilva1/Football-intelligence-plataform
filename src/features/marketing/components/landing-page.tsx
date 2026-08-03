import Link from "next/link";
import { MarketingShell } from "@/features/marketing/components/marketing-shell";
import { LandingHero } from "@/features/marketing/components/landing-hero";
import { LandingPixelPeers } from "@/features/marketing/components/landing-pixel-peers";

const ACCESS_MAIL = "mailto:access@omniscout.app?subject=OmniScout%20access%20request";

const STEPS = [
  {
    title: "Context",
    body: "Season lines, sample floors, and coverage first — before any score lands on the table.",
    href: "/methodology",
    cta: "Methodology",
  },
  {
    title: "Intelligence",
    body: "Roles, trajectory, and fit across soccer, basketball, and American football in one desk.",
    href: "/scouting",
    cta: "Open scouting",
  },
  {
    title: "Decision",
    body: "Shortlist, recruit, compare, and brief as decision support — never sold as certainty.",
    href: "/recruitment",
    cta: "Recruitment",
  },
] as const;

const TRUST = [
  {
    title: "Evidence first",
    body: "Supporting rates and season context — not a black-box overall.",
  },
  {
    title: "Sample honesty",
    body: "Provisional ratings and gaps are declared the way a trusted desk would say them.",
  },
  {
    title: "Three equal sports",
    body: "Soccer, basketball, and American football share the same scout workflow.",
  },
] as const;

export function LandingPage() {
  return (
    <MarketingShell>
      <LandingHero />
      <LandingPixelPeers />

      <section className="landing-section">
        <div className="landing-wrap">
          <div className="landing-section-head">
            <p className="landing-kicker">Workflow</p>
            <h2 className="landing-section-title">
              From season lines to a staff-room brief
            </h2>
            <p className="landing-section-lede">
              The same path every time: context, intelligence, then a decision you can explain.
            </p>
          </div>

          <ol className="landing-story-list">
            {STEPS.map((step, index) => (
              <li key={step.title} className="landing-story">
                <span className="landing-story-index" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="landing-story-body">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
                <Link href={step.href} className="landing-story-link">
                  {step.cta}
                  <span aria-hidden> →</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-trust">
        <div className="landing-wrap">
          <div className="landing-section-head">
            <p className="landing-kicker">Trust</p>
            <h2 className="landing-section-title">Honest about what the data can say</h2>
            <p className="landing-section-lede">
              OmniScout is a multi-sport intelligence desk — not a live Opta feed, and not certainty theatre.
            </p>
          </div>
          <div className="landing-trust-grid">
            {TRUST.map((item) => (
              <article key={item.title} className="landing-trust-item">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <Link href="/methodology" className="landing-trust-link">
            Read the methodology →
          </Link>
        </div>
      </section>

      <section className="landing-close">
        <div className="landing-wrap landing-close-inner">
          <div>
            <p className="landing-kicker landing-kicker-on-dark">Next step</p>
            <h2 className="landing-close-title">Put evidence on the table</h2>
            <p className="landing-close-copy">
              No public signup. Open the multi-sport desk, or ask for a walkthrough.
            </p>
          </div>
          <div className="landing-cta-row">
            <Link href="/scouting" className="landing-btn landing-btn-primary">
              Open the desk
            </Link>
            <a href={ACCESS_MAIL} className="landing-btn landing-btn-ghost">
              Get in touch
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
