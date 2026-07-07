import { cn } from "@/lib/utils";

const variantClasses = {
  default: "text-foreground",
  accent: "font-semibold text-primary",
  muted: "text-muted-foreground",
  mono: "font-mono text-foreground",
} as const;

/** Typed table cell for metric values in scouting tables. */
export function MetricCell({
  value,
  label,
  variant = "default",
  className,
}: {
  value: React.ReactNode;
  label?: string;
  variant?: keyof typeof variantClasses;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && <p className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>}
      <p className={cn("tabular-nums", variantClasses[variant], label && "mt-0.5")}>{value}</p>
    </div>
  );
}
