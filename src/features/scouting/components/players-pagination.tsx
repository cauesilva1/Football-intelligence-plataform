import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildFilterUrl } from "@/features/scouting/lib/build-filter-url";
import type { PaginatedResult, PlayerFilters } from "@/types";

export function PlayersPagination({
  result,
  filters,
}: {
  result: PaginatedResult<unknown>;
  filters: PlayerFilters;
}) {
  const { page, totalPages, total, pageSize } = result;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const prevUrl = buildFilterUrl("/players", { ...filters, page: page - 1 });
  const nextUrl = buildFilterUrl("/players", { ...filters, page: page + 1 });

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="text-foreground">{total === 0 ? 0 : start}-{end}</span> de{" "}
        <span className="text-foreground">{total}</span> jogadores
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={prevUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={nextUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
