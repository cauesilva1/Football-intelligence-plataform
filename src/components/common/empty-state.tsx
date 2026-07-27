"use client";

import Link from "next/link";
import {
  Bookmark,
  FileText,
  GitCompareArrows,
  SearchX,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPTY_ICONS = {
  search: SearchX,
  compare: GitCompareArrows,
  bookmark: Bookmark,
  file: FileText,
} as const;

export type EmptyStateIcon = keyof typeof EMPTY_ICONS;

export function EmptyState({
  title = "No results found",
  description = "Adjust the filters or search term to find players.",
  action,
  icon = "search",
}: {
  title?: string;
  description?: string;
  action?: { label: string; href: string };
  /** Named icon — serializable from Server Components (do not pass Lucide components). */
  icon?: EmptyStateIcon;
}) {
  const Icon = EMPTY_ICONS[icon] ?? SearchX;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-10 text-center transition-colors duration-300 hover:border-primary/25">
      <Icon className="h-8 w-8 text-muted-foreground transition-transform duration-300" />
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "transition-colors duration-300")}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
