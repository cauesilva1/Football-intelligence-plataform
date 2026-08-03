"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

const CLAIMS = [
  {
    label: "Sample floors",
    body: "Productive seasons only when apps and minutes clear the bar.",
  },
  {
    label: "Equal peers",
    body: "Soccer, basketball, and American football share one scout desk.",
  },
  {
    label: "Decision support",
    body: "Roles, trajectory, and fit — never sold as certainty.",
  },
] as const;

const ACCESS_MAIL = "mailto:access@omniscout.app?subject=OmniScout%20access%20request";

/**
 * Video masthead — brand first over landing reel.
 * Sport photos live in chapters; pixel peers sit below this hero.
 */
export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (mq.matches) {
        video.pause();
        video.removeAttribute("autoplay");
      } else {
        video.setAttribute("autoplay", "");
        void video.play().catch(() => {
          /* autoplay may be blocked; muted should usually allow it */
        });
      }
    };

    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <section className="landing-hero landing-hero-video" aria-label="OmniScout">
      <div className="landing-hero-media" aria-hidden>
        <video
          ref={videoRef}
          className="landing-hero-reel"
          src="/marketing/hero-reel.mp4"
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
        <div className="landing-hero-veil" />
        <div className="landing-hero-rule" />
      </div>

      <div className="landing-hero-layout">
        <div className="landing-hero-main">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">{APP_TAGLINE}</p>
            <p className="landing-wordmark">{APP_NAME}</p>
            <h1 className="landing-headline">
              Evidence-first scouting across three games.
            </h1>
            <p className="landing-lede">
              One sports intelligence desk — with sample limits you can defend in the room.
            </p>
            <div className="landing-cta-row">
              <Link href="/scouting" className="landing-btn landing-btn-primary landing-btn-lg">
                Open the desk
              </Link>
              <a href={ACCESS_MAIL} className="landing-btn landing-btn-ghost landing-btn-lg">
                Request a walkthrough
              </a>
            </div>
          </div>

          <aside className="landing-hero-claims" aria-label="Product principles">
            {CLAIMS.map((claim) => (
              <div key={claim.label} className="landing-hero-claim">
                <p className="landing-hero-claim-label">{claim.label}</p>
                <p className="landing-hero-claim-body">{claim.body}</p>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}
