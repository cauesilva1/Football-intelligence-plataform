/**
 * Transparent prototype notice — portfolio demo, not a production club product.
 */
export function PrototypeBanner() {
  return (
    <div
      role="note"
      className="mb-5 border-b border-border pb-3 text-xs leading-relaxed text-muted-foreground"
    >
      <p>
        <span className="font-semibold text-foreground">Prototype dataset.</span>{" "}
        Scoring models are still being refined — not a live club deployment.{" "}
        <a
          href="/methodology"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Methodology
        </a>
      </p>
    </div>
  );
}
