import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/10 text-primary",
        neutral: "border-border bg-secondary text-muted-foreground",
        secondary: "border-border bg-surface-muted text-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        amber: "border-accent-warning/30 bg-accent-warning/10 text-accent-warning",
        rose: "border-accent-negative/30 bg-accent-negative/10 text-accent-negative",
        azure: "border-accent-info/30 bg-accent-info/10 text-accent-info",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
