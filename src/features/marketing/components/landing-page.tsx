import Link from "next/link";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { MarketingShell } from "@/features/marketing/components/marketing-shell";
import { LandingHeroPlane } from "@/features/marketing/components/landing-hero-plane";
import { APP_NAME } from "@/lib/config";

const landingDisplay = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-landing-display",
  display: "swap",
});

const landingBody = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-body",
  display: "swap",
});

const ACCESS_MAIL = "mailto:access@omniscout.app?subject=OmniScout%20access%20request";

function CtaRow({ primary = "Enter scouting" }: { primary?: string }) {
  return (
    <div className="landing-cta-row">
      <Link href="/scouting" className="landing-btn-primary">
        {primary}
      </Link>
      <Link href="/methodology" className="landing-btn-ghost">
        Methodology
      </Link>
      <a href={ACCESS_MAIL} className="landing-btn-text">
        Request access
      </a>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className={`${landingDisplay.variable} ${landingBody.variable}`}>
      <MarketingShell>
        <section className="landing-hero">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-brand landing-wordmark">{APP_NAME}</p>
              <h1 className="landing-headline">
                Scouting intelligence you can explain.
              </h1>
              <p className="landing-lede">
                Role, trajectory, fit, and evidence — with sample limits visible. Built for
                recruitment desks, not highlight reels.
              </p>
              <CtaRow />
            </div>
            <div className="landing-hero-visual" aria-hidden>
              <LandingHeroPlane />
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-wrap">
            <h2 className="landing-section-title">From season data to a staff brief</h2>
            <p className="landing-section-lede">
              One workflow: understand the profile, shortlist with reasons, brief the room.
            </p>
            <div className="landing-steps">
              {[
                {
                  title: "Season context",
                  body: "Appearances, rates, and market signals — without pretending to be a live Opta feed.",
                },
                {
                  title: "Explainable scores",
                  body: "Role labels, dimensions, trajectory, similarity why, and tactical fit heuristics.",
                },
                {
                  title: "Decision support",
                  body: "Shortlist, recruitment search, and reports meant for staff — not certainty theatre.",
                },
              ].map((item) => (
                <div key={item.title} className="landing-step">
                  <h3 className="landing-step-title">{item.title}</h3>
                  <p className="landing-step-body">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-alt">
          <div className="landing-wrap landing-split">
            <div>
              <h2 className="landing-section-title">Who it is for</h2>
              <p className="landing-section-lede">
                Analysts, smaller club rooms, and academies that need honest shortlists — not another
                stats browser.
              </p>
            </div>
            <ul className="landing-list">
              <li>
                <strong>Independent analysts</strong>
                <span>Recruitment briefs without an enterprise data contract.</span>
              </li>
              <li>
                <strong>Club recruitment</strong>
                <span>A decision layer that admits coverage and sample gaps.</span>
              </li>
              <li>
                <strong>Academies</strong>
                <span>Trajectory and role fit as players move through pathways.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-wrap landing-trust">
            <h2 className="landing-section-title">Honest about what the data can say</h2>
            <p className="landing-section-lede">
              Provisional ratings, missing defensive lines, and small samples are surfaced — not
              hidden. Methodology is public. Predictions are not the product.
            </p>
            <div className="landing-cta-row">
              <Link href="/methodology" className="landing-btn-primary">
                Read methodology
              </Link>
              <Link href="/dashboard" className="landing-btn-ghost">
                Open the app
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-alt">
          <div className="landing-wrap">
            <h2 className="landing-section-title">Start with the workflow</h2>
            <p className="landing-section-lede">
              No public signup. Explore soccer intelligence, or request a guided walkthrough.
            </p>
            <CtaRow primary="Open Scouting" />
          </div>
        </section>
      </MarketingShell>
    </div>
  );
}
