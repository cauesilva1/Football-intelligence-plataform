import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-skeleton-shimmer rounded-md bg-gradient-to-r from-muted via-primary/15 to-muted bg-[length:200%_100%]",
        className
      )}
    />
  );
}
