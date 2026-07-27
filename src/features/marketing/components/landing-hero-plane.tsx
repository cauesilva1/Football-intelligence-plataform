/** Quiet product preview for the hero — stays inside its column. */
export function LandingHeroPlane() {
  return (
    <div className="landing-preview">
      <div className="landing-preview-top">
        <div>
          <p className="landing-preview-label">Role</p>
          <p className="landing-preview-role">Clinical Finisher</p>
        </div>
        <p className="landing-preview-traj">Improving</p>
      </div>
      <div className="landing-preview-dims">
        {[
          { label: "Production", score: 86 },
          { label: "Creation", score: 71 },
          { label: "Defense", score: 38 },
          { label: "Progression", score: 64 },
        ].map((dim) => (
          <div key={dim.label} className="landing-preview-dim">
            <div className="landing-preview-dim-row">
              <span>{dim.label}</span>
              <span>{dim.score}</span>
            </div>
            <div className="landing-preview-track">
              <span style={{ width: `${dim.score}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="landing-preview-note">G/90 0.62 · cohort p82 · provisional under 900′</p>
    </div>
  );
}
