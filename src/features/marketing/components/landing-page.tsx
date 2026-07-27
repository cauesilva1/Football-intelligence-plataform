import Link from "next/link";
import { Syne, Source_Sans_3 } from "next/font/google";
import { MarketingShell } from "@/features/marketing/components/marketing-shell";
import { APP_NAME } from "@/lib/config";

const landingDisplay = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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

export function LandingPage() {
  return (
    <div className={`${landingDisplay.variable} ${landingBody.variable}`}>
      <MarketingShell>
        {/* Hero — one composition: brand, headline, sentence, CTAs, full-bleed visual */}
        <section className="landing-hero relative isolate min-h-[100svh] overflow-hidden">
          <div className="landing-hero-visual absolute inset-0" aria-hidden />
          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-32">
            <p className="landing-reveal landing-brand text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-7xl lg:text-8xl">
              {APP_NAME}
            </p>
            <h1 className="landing-reveal landing-reveal-delay-1 mt-5 max-w-2xl text-xl font-semibold leading-snug text-white/95 sm:text-2xl md:text-3xl">
              The decision layer for scouts.
            </h1>
            <p className="landing-reveal landing-reveal-delay-2 mt-4 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
              Role, trajectory, fit, and evidence — so recruitment briefs are explainable, not
              opaque overall ratings.
            </p>
            <div className="landing-reveal landing-reveal-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/scouting"
                className="inline-flex items-center rounded-md bg-[hsl(142_71%_45%)] px-5 py-2.5 text-sm font-semibold text-[hsl(150_18%_5%)] transition-transform duration-300 hover:scale-[1.02] hover:bg-[hsl(142_71%_50%)]"
              >
                Enter scouting
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white/85 transition-colors duration-300 hover:border-white/40 hover:bg-white/5"
              >
                Read methodology
              </Link>
              <a
                href={ACCESS_MAIL}
                className="inline-flex items-center px-2 py-2.5 text-sm font-medium text-white/55 underline-offset-4 transition-colors duration-300 hover:text-white hover:underline"
              >
                Request access
              </a>
            </div>
          </div>
        </section>

        {/* How it works — one job */}
        <section className="border-t border-white/8 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="landing-brand text-2xl font-bold tracking-tight text-white md:text-3xl">
              How it works
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/55">
              From raw season data to a staff-ready recommendation — always with limitations
              declared.
            </p>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  step: "01",
                  title: "Data",
                  body: "Season lines, appearances, and market context — no pretended live Opta feed.",
                },
                {
                  step: "02",
                  title: "Intelligence",
                  body: "Role labels, dimensions, trajectory, similarity why, and tactical fit heuristics.",
                },
                {
                  step: "03",
                  title: "Decision",
                  body: "Shortlist, recruitment search, and scout briefs built as decision support.",
                },
              ].map((item) => (
                <li key={item.step} className="landing-step border-t border-white/12 pt-6">
                  <p className="font-mono text-xs tracking-widest text-[hsl(142_71%_45%)]">
                    {item.step}
                  </p>
                  <h3 className="landing-brand mt-3 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Audiences — one job */}
        <section className="border-t border-white/8 bg-[hsl(150_14%_6%)] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="landing-brand text-2xl font-bold tracking-tight text-white md:text-3xl">
              Built for the scouting desk
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/55">
              Workflow first — for people who need explainable shortlists, not another stats
              browser.
            </p>
            <div className="mt-12 grid gap-12 md:grid-cols-3">
              {[
                {
                  title: "Independent analysts",
                  body: "Run recruitment briefs and compare profiles without enterprise contracts.",
                },
                {
                  title: "Clubs",
                  body: "A practical decision layer for smaller recruitment rooms — honest about coverage.",
                },
                {
                  title: "Academies",
                  body: "Track trajectory and role fit as players move through pathways.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <h3 className="landing-brand text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust — one job */}
        <section className="border-t border-white/8 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="landing-brand text-2xl font-bold tracking-tight text-white md:text-3xl">
              Trust before flair
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
              Every score should show evidence and limits — small samples, missing defensive data,
              provisional ratings. This is a working prototype, not a prediction engine.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/methodology"
                className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors duration-300 hover:border-primary/40 hover:text-white"
              >
                Scoring methodology →
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors duration-300 hover:border-white/30 hover:text-white"
              >
                Open dashboard →
              </Link>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-white/8 bg-[linear-gradient(180deg,hsl(150_14%_6%),hsl(150_20%_5%))] px-5 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="landing-brand text-2xl font-bold text-white md:text-4xl">
              Start with the workflow.
            </h2>
            <p className="mt-3 max-w-lg text-sm text-white/55">
              No public signup. Explore the soccer intelligence layer, or request a guided walkthrough.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/scouting"
                className="inline-flex items-center rounded-md bg-[hsl(142_71%_45%)] px-5 py-2.5 text-sm font-semibold text-[hsl(150_18%_5%)] transition-transform duration-300 hover:scale-[1.02]"
              >
                Open Scouting
              </Link>
              <a
                href={ACCESS_MAIL}
                className="inline-flex items-center rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white/85 transition-colors duration-300 hover:bg-white/5"
              >
                Request access
              </a>
            </div>
          </div>
        </section>
      </MarketingShell>
    </div>
  );
}
