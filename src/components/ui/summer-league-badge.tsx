import { cn } from "@/lib/utils";

/** Static Summer League marker — no animation (Summer is not a separate hub). */
export function SummerLeagueBadge({
  className,
  label = "Summer League",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-amber-300",
        className
      )}
    >
      {label}
    </span>
  );
}
