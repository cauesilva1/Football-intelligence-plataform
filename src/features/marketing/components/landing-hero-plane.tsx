"use client";

import { useEffect, useState } from "react";
import {
  AmericanFootballIcon,
  BasketballIcon,
  SoccerBallIcon,
} from "@/components/icons/sport-balls";

type LandingSport = "SOCCER" | "BASKETBALL" | "AMERICAN_FOOTBALL";

const SPORT_PROFILES: Record<
  LandingSport,
  {
    label: string;
    role: string;
    trajectory: string;
    dims: { label: string; score: number; hint: string }[];
    limit: string;
  }
> = {
  SOCCER: {
    label: "Soccer",
    role: "Clinical Finisher",
    trajectory: "Trajectory · Improving",
    dims: [
      { label: "Production", score: 86, hint: "G/90 · cohort" },
      { label: "Creation", score: 71, hint: "Key passes" },
      { label: "Defense", score: 38, hint: "Sparse sample" },
      { label: "Progression", score: 64, hint: "Carry + pass" },
    ],
    limit: "Provisional — under 900′ · decision support, not certainty",
  },
  BASKETBALL: {
    label: "Basketball",
    role: "Two-Way Wing",
    trajectory: "Trajectory · Stable",
    dims: [
      { label: "Scoring", score: 81, hint: "PTS · efficiency" },
      { label: "Playmaking", score: 74, hint: "AST · usage" },
      { label: "Defense", score: 69, hint: "STL · BLK" },
      { label: "Rebounding", score: 58, hint: "REB · contests" },
    ],
    limit: "Provisional — thin minutes · decision support, not certainty",
  },
  AMERICAN_FOOTBALL: {
    label: "American Football",
    role: "Vertical Threat WR",
    trajectory: "Trajectory · Improving",
    dims: [
      { label: "Receiving", score: 84, hint: "YPR · targets" },
      { label: "Yards after", score: 72, hint: "YAC · contested" },
      { label: "Separation", score: 77, hint: "Route depth" },
      { label: "Blocking", score: 41, hint: "Limited snaps" },
    ],
    limit: "Provisional — sample floors apply · decision support, not certainty",
  },
};

const SPORT_ORDER: LandingSport[] = ["SOCCER", "BASKETBALL", "AMERICAN_FOOTBALL"];
const SPORT_ICONS = {
  SOCCER: SoccerBallIcon,
  BASKETBALL: BasketballIcon,
  AMERICAN_FOOTBALL: AmericanFootballIcon,
} as const;

/** Product visual for hero — multi-sport intelligence surface. */
export function LandingHeroPlane() {
  const [sport, setSport] = useState<LandingSport>("BASKETBALL");
  const [paused, setPaused] = useState(false);
  const profile = SPORT_PROFILES[sport];

  // Rotate peers so the first viewport never reads as soccer-only.
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setSport((current) => {
        const index = SPORT_ORDER.indexOf(current);
        return SPORT_ORDER[(index + 1) % SPORT_ORDER.length];
      });
    }, 4200);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div className="landing-stage" data-landing-sport={sport}>
      <div className="landing-stage-glow" />
      <div className="landing-stage-panel">
        <div className="landing-stage-sports" role="tablist" aria-label="Sports">
          {SPORT_ORDER.map((id) => {
            const Icon = SPORT_ICONS[id];
            const active = sport === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? "is-active" : undefined}
                onClick={() => {
                  setPaused(true);
                  setSport(id);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {SPORT_PROFILES[id].label}
              </button>
            );
          })}
        </div>

        <div className="landing-stage-meta">
          <span>Intelligence profile</span>
          <span>{profile.label} · Season sample</span>
        </div>
        <p className="landing-stage-role">{profile.role}</p>
        <p className="landing-stage-traj">{profile.trajectory}</p>

        <div className="landing-stage-dims">
          {profile.dims.map((dim) => (
            <div key={dim.label} className="landing-stage-dim">
              <div className="landing-stage-dim-top">
                <span>{dim.label}</span>
                <strong>{dim.score}</strong>
              </div>
              <div className="landing-stage-bar">
                <i style={{ width: `${dim.score}%` }} />
              </div>
              <span className="landing-stage-hint">{dim.hint}</span>
            </div>
          ))}
        </div>

        <p className="landing-stage-limit">{profile.limit}</p>
      </div>
    </div>
  );
}

export function LandingSignalStrip() {
  return (
    <section className="landing-signals" aria-label="Product signals">
      <div className="landing-wrap">
        <p className="landing-signals-intro">
          One scout workflow across sports — when a shortlist needs a reason, it needs more than an
          overall rating.
        </p>
        <div className="landing-signals-grid">
          {[
            { value: "Role", label: "Named playing style from the season line" },
            { value: "Why", label: "Similarity explained with evidence, not vibes" },
            { value: "Fit", label: "Recruitment heuristics ranked for the brief" },
            { value: "Limits", label: "Small sample and data gaps declared" },
          ].map((item) => (
            <div key={item.value} className="landing-signal">
              <p className="landing-signal-value">{item.value}</p>
              <p className="landing-signal-label">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingSportsStrip() {
  return (
    <section className="landing-sports" aria-label="Supported sports">
      <div className="landing-wrap">
        <p className="landing-kicker">Three sports. One desk.</p>
        <h2 className="landing-section-title">
          Soccer first — basketball and American football as secondary desks
        </h2>
        <p className="landing-sports-lede">
          Same scout workflow, honesty rules, and decision layer for every sport we cover.
          Sport-native metrics and intelligence deepen in parallel — not a soccer product with
          extras bolted on.
        </p>
        <div className="landing-sports-grid">
          {[
            {
              id: "SOCCER" as const,
              title: "Soccer",
              body: "Roles, percentiles, recruitment fit, tactical heuristics, and staff briefs on soccer-native lines.",
              status: "First-class sport",
            },
            {
              id: "BASKETBALL" as const,
              title: "Basketball",
              body: "Basketball-native ratings, shortlist, compare, and reports — same desk, same decision language.",
              status: "First-class sport",
            },
            {
              id: "AMERICAN_FOOTBALL" as const,
              title: "American Football",
              body: "Position-aware ratings and briefs for NFL / college context inside the same product shell.",
              status: "First-class sport",
            },
          ].map((sport) => {
            const Icon = SPORT_ICONS[sport.id];
            return (
              <article key={sport.id} className="landing-sport-card" data-landing-sport={sport.id}>
                <div className="landing-sport-card-head">
                  <span className="landing-sport-icon">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3>{sport.title}</h3>
                </div>
                <p>{sport.body}</p>
                <span className="landing-sport-status">{sport.status}</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
