/** Full-bleed product plane — intelligence UI as the hero visual, not a floating card. */
export function LandingHeroPlane() {
  return (
    <div className="landing-hero-plane" aria-hidden>
      <div className="landing-hero-plane-glow" />
      <div className="landing-hero-plane-grid" />
      <div className="landing-hero-product">
        <div className="landing-hero-product-head">
          <span className="landing-hero-product-role">Clinical Finisher</span>
          <span className="landing-hero-product-traj">Trajectory · Improving</span>
        </div>
        <div className="landing-hero-dims">
          {[
            { label: "Production", score: 86 },
            { label: "Creation", score: 71 },
            { label: "Defense", score: 38 },
            { label: "Progression", score: 64 },
          ].map((dim) => (
            <div key={dim.label} className="landing-hero-dim">
              <div className="landing-hero-dim-meta">
                <span>{dim.label}</span>
                <span className="landing-hero-dim-score">{dim.score}</span>
              </div>
              <div className="landing-hero-dim-track">
                <div
                  className="landing-hero-dim-fill"
                  style={{ ["--dim" as string]: `${dim.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="landing-hero-evidence">
          <p>G/90 · 0.62 · cohort p82</p>
          <p>Provisional — under 900′ sample</p>
        </div>
      </div>
    </div>
  );
}
