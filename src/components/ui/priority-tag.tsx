import { SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Prioridade } from "@/lib/dominio";

const ESTILO: Record<Prioridade, { rotulo: string; classes: string; icone: LucideIcon }> = {
  alta: {
    rotulo: "Prioridade alta",
    classes: "border-negativo-borda/80 bg-negativo-fundo/72 text-negativo",
    icone: SignalHigh,
  },
  media: {
    rotulo: "Prioridade média",
    classes: "border-atencao-borda/80 bg-atencao-fundo/72 text-atencao",
    icone: SignalMedium,
  },
  baixa: {
    rotulo: "Prioridade baixa",
    classes: "border-card-border/80 bg-surface/72 text-outline",
    icone: SignalLow,
  },
};

export function PrioridadeTag({ prioridade, className }: { prioridade: Prioridade; className?: string }) {
  const estilo = ESTILO[prioridade];
  const Icone = estilo.icone;

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.8} />
      {estilo.rotulo}
    </span>
  );
}
