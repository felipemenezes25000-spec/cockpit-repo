import { SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Prioridade } from "@/lib/dominio";

/**
 * Alta é vermelha porque é o que não pode esperar. Média é atenção — precisa
 * ser feito, não está errado. Baixa fica neutra: destacar tudo é não destacar
 * nada.
 */
const ESTILO: Record<Prioridade, { rotulo: string; classes: string; icone: LucideIcon }> = {
  alta: { rotulo: "Prioridade alta", classes: "text-negativo font-medium", icone: SignalHigh },
  media: { rotulo: "Prioridade média", classes: "text-atencao", icone: SignalMedium },
  baixa: { rotulo: "Prioridade baixa", classes: "text-outline", icone: SignalLow },
};

/**
 * Prioridade em texto + ícone de barras. Quem não distingue as cores continua
 * lendo o nível pelo número de barras e pelo próprio rótulo.
 */
export function PrioridadeTag({
  prioridade,
  className,
}: {
  prioridade: Prioridade;
  className?: string;
}) {
  const estilo = ESTILO[prioridade];
  const Icone = estilo.icone;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", estilo.classes, className)}>
      <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
      {estilo.rotulo}
    </span>
  );
}
