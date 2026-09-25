import { SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Prioridade } from "@/lib/dominio";

const ESTILO: Record<Prioridade, { rotulo: string; classes: string; icone: LucideIcon }> = {
  alta: {
    rotulo: "Prioridade alta",
    classes: "border-negativo-borda bg-negativo-fundo text-negativo",
    icone: SignalHigh,
  },
  media: {
    rotulo: "Prioridade média",
    classes: "border-atencao-borda bg-atencao-fundo text-atencao",
    icone: SignalMedium,
  },
  baixa: {
    rotulo: "Prioridade baixa",
    classes: "border-card-border bg-surface text-outline",
    icone: SignalLow,
  },
};

export function PrioridadeTag({ prioridade, className }: { prioridade: Prioridade; className?: string }) {
  const estilo = ESTILO[prioridade];
  const Icone = estilo.icone;

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap shadow-[0_7px_16px_-15px_rgba(8,41,76,.42)]",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.8} />
      {estilo.rotulo}
    </span>
  );
}
