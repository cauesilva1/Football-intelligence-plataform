import { cn } from "@/lib/utils";

export function GlossaryTooltip({
  label,
  description,
  className,
  placement = "bottom",
}: {
  label: React.ReactNode;
  description: string;
  className?: string;
  placement?: "top" | "bottom";
}) {
  return (
    <div className={cn("group relative inline-flex cursor-help items-center gap-1", className)}>
      {label}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 hidden w-56 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-[11px] font-normal normal-case leading-snug text-muted-foreground shadow-panel group-hover:block",
          placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
        )}
      >
        {description}
      </div>
    </div>
  );
}

export const POSITION_GLOSSARY: Record<string, string> = {
  GK: "Goleiro",
  CB: "Zagueiro",
  LB: "Lateral esquerdo",
  RB: "Lateral direito",
  CDM: "Volante",
  CM: "Meio-campista",
  CAM: "Meia atacante",
  LW: "Atacante — ponta esquerda",
  RW: "Atacante — ponta direita",
  ST: "Atacante — centroavante",
  FW: "Atacante",
  MF: "Meio-campista",
  DF: "Defensor",
};

export const METRIC_GLOSSARY = {
  xG: "Gols Esperados (Expected Goals): mede a probabilidade de uma finalização resultar em gol com base no histórico da jogada.",
  xA: "Assistências Esperadas (Expected Assists): mede a probabilidade de um passe se tornar uma assistência direta para gol.",
  rating:
    "Nota sintética derivada de produtividade, volume de jogo e contribuição defensiva na temporada.",
} as const;
