import { cn } from "@/lib/utils";

/** Visual container for filter controls — layout only, no filter logic. */
export function FilterBar({
  children,
  footer,
  pending = false,
  className,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  pending?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-panel transition-opacity",
        pending && "opacity-70",
        className
      )}
    >
      <div className="flex flex-wrap items-end gap-3 p-4">{children}</div>
      {footer && <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">{footer}</div>}
    </div>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-[140px] flex-1", className)}>
      <label className="mb-1 block text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
