"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AmericanFootballIcon,
  BasketballIcon,
  HockeyPuckIcon,
  SoccerBallIcon,
} from "@/components/icons/sport-balls";

const SPORT_CARDS = [
  {
    id: "soccer",
    label: "Soccer",
    accent: "#1f8f4e",
    bg: "#14261c",
    href: "/scouting?desk=soccer",
    kicker: "01 · Soccer",
    title: "Big Five and Brazilian League",
    body: "European showcase and Brazilian League — discover, shortlist, and brief with productive-season floors visible.",
    points: ["Big5 depth first", "Brazilian League", "Honest sample limits"],
    media: [
      {
        src: "/marketing/pixel-soccer-a.gif",
        alt: "Pixel soccer kick",
        durationMs: 3300,
        fill: "#5174cc",
        fit: "contain",
      },
    ],
    Icon: SoccerBallIcon,
  },
  {
    id: "basketball",
    label: "Basketball",
    accent: "#e67a2e",
    bg: "#2a1c10",
    href: "/scouting?desk=basketball",
    kicker: "02 · Basketball",
    title: "NBA and college rails",
    body: "The same scout desk for hoops — roles, archetypes, and recruitment fit without inventing coverage.",
    points: ["NBA workflow", "College path in thesis", "Shared intelligence rails"],
    media: [
      {
        src: "/marketing/pixel-basketball-b.gif",
        alt: "Pixel LeBron run",
        durationMs: 6500,
        fill: "#b61936",
        fit: "cover",
      },
      {
        src: "/marketing/pixel-basketball-a.gif",
        alt: "Pixel basketball shot",
        durationMs: 8100,
        fill: "#f0b020",
        fit: "cover",
      },
    ],
    Icon: BasketballIcon,
  },
  {
    id: "football",
    label: "Football",
    accent: "#2f6fed",
    bg: "#121a2a",
    href: "/scouting?desk=football",
    kicker: "03 · Football",
    title: "NFL and college football",
    body: "Position-first scouting with season production on the profile — decision support, not vanity overalls.",
    points: ["NFL + CFB filters", "Position-native views", "Production on profile"],
    media: [
      {
        src: "/marketing/pixel-football-b.gif",
        alt: "Pixel football throw",
        durationMs: 5000,
        fill: "#ffc200",
        fit: "contain",
      },
    ],
    Icon: AmericanFootballIcon,
  },
  {
    id: "hockey",
    label: "Hockey",
    accent: "#3db7d6",
    bg: "#0c1c24",
    href: "/scouting?desk=hockey",
    kicker: "04 · Hockey",
    title: "NHL season, live",
    body: "Standings, results, and skater or goalie lines from the official NHL feed — including a shot map on profiles that have coordinates.",
    points: ["2026-27 in progress", "Upcoming and results", "Honest empty lines"],
    media: [
      {
        src: "/marketing/hockey.mp4",
        alt: "Hockey loop",
        durationMs: 4000,
        fill: "#0c1c24",
        fit: "cover",
      },
    ],
    Icon: HockeyPuckIcon,
  },
] as const;

type SportMedia = (typeof SPORT_CARDS)[number]["media"][number];

function SportCardMedia({ media }: { media: readonly SportMedia[] }) {
  const [active, setActive] = useState(0);
  const [playId, setPlayId] = useState(0);
  const reduceMotion = usePrefersReducedMotion();
  const current = media[active] ?? media[0];

  useEffect(() => {
    if (reduceMotion || media.length < 2 || !current) return;
    const id = window.setTimeout(() => {
      setActive((index) => (index + 1) % media.length);
      setPlayId((value) => value + 1);
    }, current.durationMs);
    return () => window.clearTimeout(id);
  }, [active, current, media.length, playId, reduceMotion]);

  if (!current) return null;

  return (
    <div
      className="landing-sport-card-media"
      data-fit={current.fit}
      style={{ ["--media-fill" as string]: current.fill }}
    >
      {current.src.endsWith(".mp4") ? (
        <video
          key={`${current.src}-${playId}`}
          className="landing-sport-card-clip"
          data-kind="video"
          data-active="true"
          src={current.src}
          aria-label={current.alt}
          muted
          playsInline
          loop
          autoPlay={!reduceMotion}
          preload="metadata"
        />
      ) : (
        /* Animated GIF peers — next/image is a poor fit for looping pixel GIFs */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={`${current.src}-${playId}`}
          src={current.src}
          alt={current.alt}
          className="landing-sport-card-clip"
          data-active="true"
          width={800}
          height={600}
          decoding="async"
        />
      )}
    </div>
  );
}

/** Full sport cards — pixel motion + coverage (chapters removed). */
export function LandingPixelPeers() {
  return (
    <section className="landing-sport-cards" aria-label="Sports">
      <div className="landing-wrap landing-sport-cards-head">
        <p className="landing-kicker">Sports desk</p>
        <h2 className="landing-sport-cards-title">Four games. One scout workflow.</h2>
        <p className="landing-sport-cards-lede">
          Soccer, basketball, football, and hockey follow the same scout workflow.
        </p>
      </div>

      <div className="landing-wrap landing-sport-cards-grid">
        {SPORT_CARDS.map((card) => {
          const Icon = card.Icon;
          return (
            <article
              key={card.id}
              className="landing-sport-card"
              style={{
                ["--card-accent" as string]: card.accent,
                ["--card-bg" as string]: card.bg,
              }}
            >
              <SportCardMedia media={card.media} />

              <div className="landing-sport-card-body">
                <p className="landing-sport-card-kicker">
                  <Icon className="h-4 w-4" />
                  {card.kicker}
                </p>
                <h3>{card.title}</h3>
                <p className="landing-sport-card-copy">{card.body}</p>
                <ul>
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="landing-sport-card-actions">
                  <Link
                    href={card.href}
                    className="landing-btn landing-btn-primary landing-btn-lg"
                  >
                    Open {card.label.toLowerCase()} desk
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
