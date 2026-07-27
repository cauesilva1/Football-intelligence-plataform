import Link from "next/link";
import { Syne, Source_Sans_3 } from "next/font/google";
import { MarketingShell } from "@/features/marketing/components/marketing-shell";
import { LandingHeroPlane } from "@/features/marketing/components/landing-hero-plane";
import { APP_NAME } from "@/lib/config";

const landingDisplay = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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

function CtaRow({ primary = "Enter scouting" }: { primary?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
        <section className="landing-hero relative isolate min-h-[100svh] overflow-hidden">
          <div className="landing-hero-bg" aria-hidden />

          {/* Product is always the dominant visual plane */}
          <div className="landing-hero-visual-slot" aria-hidden>
            <LandingHeroPlane />
          </div>

          <div className="landing-hero-copy relative z-10 flex min-h-[100svh] flex-col justify-end pb-14 pt-28 md:pb-20 lg:pb-24">
            <p className="landing-brand landing-wordmark">{APP_NAME}</p>
            <h1 className="landing-brand landing-headline">
              Intelligence you can defend in a recruitment room.
            </h1>
            <p className="landing-lede">
              Roles, dimensions, trajectory, and fit — with evidence and sample limits visible.
              Built for scouts, not highlight reels.
            </p>
            <div className="mt-9">
              <CtaRow />
            </div>
          </div>
        </section>

        <section className="landing-section border-t border-white/[0.07]">
          <div className="mx-auto max-w-[88rem] px-5 md:px-10">
            <p className="landing-kicker">Workflow</p>
            <h2 className="landing-brand landing-section-title max-w-3xl">
              Data becomes a decision — with the why attached.
            </h2>
            <ol className="landing-flow mt-14">
              {[
                {
                  step: "01",
                  title: "Ingest the season",
                  body: "Appearances, rates, market context. No fake live feed.",
                },
                {
                  step: "02",
                  title: "Score the profile",
                  body: "Role, dimensions, trajectory, similarity reasons, tactical fit.",
                },
                {
                  step: "03",
                  title: "Brief the staff",
                  body: "Shortlist, recruitment search, and staff-ready reports.",
                },
              ].map((item) => (
                <li key={item.step} className="landing-flow-item">
                  <span className="landing-flow-step">{item.step}</span>
                  <h3 className="landing-brand landing-flow-title">{item.title}</h3>
                  <p className="landing-flow-body">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-section-muted border-t border-white/[0.07]">
          <div className="mx-auto max-w-[88rem] px-5 md:px-10">
            <p className="landing-kicker">Who it serves</p>
            <h2 className="landing-brand landing-section-title max-w-3xl">
              For desks that need explainable shortlists — not another Sofascore clone.
            </h2>
            <div className="landing-audiences mt-16">
              {[
                {
                  title: "Independent analysts",
                  body: "Run recruitment briefs and compare profiles without an enterprise data contract.",
                },
                {
                  title: "Club recruitment",
                  body: "A decision layer for smaller rooms — honest about coverage and sample size.",
                },
                {
                  title: "Academies",
                  body: "Track trajectory and role fit as players move through pathways.",
                },
              ].map((item, index) => (
                <div key={item.title} className="landing-audience">
                  <span className="landing-audience-index">0{index + 1}</span>
                  <h3 className="landing-brand">{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section border-t border-white/[0.07]">
          <div className="mx-auto grid max-w-[88rem] gap-12 px-5 md:grid-cols-[1.2fr_0.8fr] md:items-end md:px-10">
            <div>
              <p className="landing-kicker">Trust</p>
              <h2 className="landing-brand landing-section-title">
                Small sample. Missing tackles. Say it out loud.
              </h2>
              <p className="landing-section-copy mt-6 max-w-xl">
                OmniScout surfaces provisional ratings, data gaps, and limitations instead of
                inventing certainty. Methodology is public. Predictions are not the product —
                explainable decision support is.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link href="/methodology" className="landing-btn-primary">
                Read the methodology
              </Link>
              <Link href="/dashboard" className="landing-btn-ghost">
                Open the app
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-close border-t border-white/[0.07]">
          <div className="mx-auto max-w-[88rem] px-5 py-24 md:px-10 md:py-32">
            <p className="landing-brand landing-close-brand">{APP_NAME}</p>
            <h2 className="landing-brand landing-close-title">Start on the pitch desk.</h2>
            <p className="landing-section-copy mt-5 max-w-lg">
              No public signup. Explore soccer intelligence now, or request a guided walkthrough.
            </p>
            <div className="mt-10">
              <CtaRow primary="Open Scouting" />
            </div>
          </div>
        </section>
      </MarketingShell>
    </div>
  );
}
