import { Beaker } from "lucide-react";

/**
 * Transparent prototype notice — portfolio demo, not a production club product.
 */
export function PrototypeBanner() {
  return (
    <div
      role="note"
      className="mb-4 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground"
    >
      <Beaker className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <p>
        <span className="font-medium text-foreground">Prototype dataset.</span>{" "}
        The current version uses a prototype dataset and scoring models that are
        still being refined — not a live club scouting deployment. See{" "}
        <a
          href="/methodology"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          scoring notes
        </a>
        .
      </p>
    </div>
  );
}
