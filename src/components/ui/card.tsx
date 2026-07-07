import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("border border-border bg-card text-card-foreground shadow-panel", {
  variants: {
    density: {
      default: "rounded-2xl",
      dense: "rounded-xl",
    },
  },
  defaultVariants: { density: "default" },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, density, ...props }: CardProps) {
  return <div className={cn(cardVariants({ density }), className)} {...props} />;
}

const cardSectionPadding = {
  default: { header: "p-5 pb-0", content: "p-5", footer: "p-5 pt-0" },
  dense: { header: "p-4 pb-0", content: "p-4", footer: "p-4 pt-0" },
} as const;

export function CardHeader({
  className,
  density = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { density?: "default" | "dense" }) {
  return (
    <div className={cn("flex flex-col gap-1", cardSectionPadding[density].header, className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-sm font-semibold tracking-wide text-card-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export function CardContent({
  className,
  density = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { density?: "default" | "dense" }) {
  return <div className={cn(cardSectionPadding[density].content, className)} {...props} />;
}

export function CardFooter({
  className,
  density = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { density?: "default" | "dense" }) {
  return (
    <div className={cn("flex items-center", cardSectionPadding[density].footer, className)} {...props} />
  );
}
