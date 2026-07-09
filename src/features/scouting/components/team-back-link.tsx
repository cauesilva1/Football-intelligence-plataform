import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { isBrazilianLeague } from "@/lib/seasons";

export function TeamBackLink({ competitionName }: { competitionName?: string | null }) {
  const href = isBrazilianLeague(competitionName)
    ? "/teams?league=brasileirao"
    : "/teams";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      Voltar para Clubes
    </Link>
  );
}
