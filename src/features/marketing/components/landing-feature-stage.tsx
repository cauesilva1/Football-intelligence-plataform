/** Static featured media band — no tilt / 3D. */
export function LandingFeatureStage({
  imageSrc,
  position = "center 28%",
}: {
  imageSrc: string;
  position?: string;
}) {
  return (
    <div className="landing-feature-stage">
      <div
        className="landing-feature-media"
        style={{
          backgroundImage: `url("${imageSrc}")`,
          backgroundPosition: position,
        }}
        aria-hidden
      />
    </div>
  );
}
