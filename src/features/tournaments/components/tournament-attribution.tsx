import { StatsBombAttribution } from "@/features/scouting/components/statsbomb-attribution";
import type { TournamentDataSource } from "@/lib/tournaments/types";

function ApiSportsAttribution() {
  return (
    <footer>
      <div className="flex flex-col items-center gap-3 border-t border-border pt-8 text-center">
        <div className="flex h-8 items-center rounded-md bg-[#1a472a] px-3 font-display text-sm font-bold tracking-tight text-white">
          API<span className="text-[#4ade80]">-Sports</span>
        </div>
        <p className="max-w-lg text-xs text-muted-foreground">
          Dados em tempo real fornecidos por API-Football (API-Sports). Atualização automática a cada 15
          minutos via cache local.
        </p>
      </div>
    </footer>
  );
}

function ScrapedAttribution() {
  return (
    <footer>
      <div className="flex flex-col items-center gap-3 border-t border-border pt-8 text-center">
        <div className="flex h-8 items-center rounded-md bg-slate-900 px-3 font-display text-sm font-bold tracking-tight text-white">
          ESPN<span className="text-sky-400"> Scraper</span>
        </div>
        <p className="max-w-lg text-xs text-muted-foreground">
          Dados extraídos de feed público ESPN e armazenados em{" "}
          <code className="text-[10px]">src/data/mock/world-cup-2026.json</code>. Atualize com{" "}
          <code className="text-[10px]">npm run fetch:wc2026</code> — sem consumo da cota API-Sports.
        </p>
      </div>
    </footer>
  );
}

export function TournamentAttribution({ source }: { source: TournamentDataSource }) {
  if (source === "api-sports") return <ApiSportsAttribution />;
  if (source === "scraped") return <ScrapedAttribution />;
  return <StatsBombAttribution />;
}
