import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <SearchX className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This page or match doesn&apos;t exist in the current database. It may not be synced yet.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/dashboard" className={buttonVariants({ variant: "default", size: "sm" })}>
            Back to Overview
          </Link>
          <Link href="/scouting" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Scouting
          </Link>
        </div>
      </div>
    </div>
  );
}
