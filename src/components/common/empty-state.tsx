"use client";

import Link from "next/link";
import {
  Bookmark,
  FileText,
  GitCompareArrows,
  SearchX,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

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
