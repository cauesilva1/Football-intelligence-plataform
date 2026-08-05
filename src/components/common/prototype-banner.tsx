/**
 * Public beta notice — honest about sources and models, not a club Opta replacement.
 */
export function PrototypeBanner() {
  return (
    <div
      role="note"
      className="mb-5 border-b border-border pb-3 text-xs leading-relaxed text-muted-foreground"
    >
      <p>
        <span className="font-semibold text-foreground">Public beta.</span>{" "}
        Live feeds (ESPN / API-Football) + our own ratings — not Opta/Sofascore. Sample floors
        apply; empty panels mean missing sync, not inventing zeros.{" "}
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
