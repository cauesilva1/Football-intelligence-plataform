"use client";

import Link from "next/link";
import { SearchX, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  title = "No results found",
  description = "Adjust the filters or search term to find players.",
  action,
  icon: Icon = SearchX,
}: {
  title?: string;
  description?: string;
  action?: { label: string; href: string };
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && (
        <Link href={action.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
