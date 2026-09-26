import {
  Ban,
  Check,
  CircleAlert,
  Clock3,
  PencilLine,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ROTULO_SITUACAO_RECEBIMENTO, type SituacaoRecebimento } from "@/lib/venda";
import { despesaVencida, ROTULO_SITUACAO_DESPESA, type SituacaoDespesa } from "@/lib/despesa";

/**
 * Chips do financeiro, na semântica de cor do sistema: vermelho só para o
 * que deu errado, laranja para o que falta fazer, verde para o que entrou.
 * Cor nunca vem sozinha — sempre com ícone e texto.
 */

type Estilo = { icone: LucideIcon; classes: string };

const RECEBIMENTO: Record<SituacaoRecebimento, Estilo> = {
  previsto: { icone: Clock3, classes: "border-informativo-borda bg-informativo-fundo text-informativo-texto" },
  pendente: { icone: TriangleAlert, classes: "border-atencao-borda bg-atencao-fundo text-atencao" },
  recebido: { icone: Check, classes: "border-positivo-borda bg-positivo-fundo text-positivo" },
  recebido_divergencia: { icone: CircleAlert, classes: "border-atencao-borda bg-atencao-fundo text-atencao" },
  cancelado: { icone: Ban, classes: "border-negativo-borda bg-negativo-fundo text-negativo" },
};

export function ChipRecebimento({
  situacao,
  className,
}: {
  situacao: SituacaoRecebimento;
  className?: string;
}) {
  const estilo = RECEBIMENTO[situacao];
  const Icone = estilo.icone;

  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-left text-xs leading-4 font-semibold shadow-[0_7px_16px_-15px_rgba(8,41,76,.4)] [&_svg]:shrink-0",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.85} />
      <span className="min-w-0 break-words">{ROTULO_SITUACAO_RECEBIMENTO[situacao]}</span>
    </span>
  );
}

export function ChipDespesa({
  situacao,
  venceEmDias,
  className,
}: {
  situacao: SituacaoDespesa;
  venceEmDias: number;
  className?: string;
}) {
  // Vencida é derivada: pendente com o prazo no passado.
  const vencida = despesaVencida(situacao, venceEmDias);

  const estilo: Estilo = vencida
    ? { icone: TriangleAlert, classes: "border-negativo-borda bg-negativo-fundo text-negativo" }
    : situacao === "paga"
      ? { icone: Check, classes: "border-positivo-borda bg-positivo-fundo text-positivo" }
      : situacao === "cancelada"
        ? { icone: Ban, classes: "border-card-border bg-surface-container text-on-surface-variant" }
        : { icone: Clock3, classes: "border-atencao-borda bg-atencao-fundo text-atencao" };

  const Icone = estilo.icone;

  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-left text-xs leading-4 font-semibold shadow-[0_7px_16px_-15px_rgba(8,41,76,.4)] [&_svg]:shrink-0",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.85} />
      <span className="min-w-0 break-words">{vencida ? "Vencida" : ROTULO_SITUACAO_DESPESA[situacao]}</span>
    </span>
  );
}

/** Marca de taxa alterada manualmente — sempre visível onde a taxa aparece. */
export function MarcaTaxaManual({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border border-atencao-borda bg-atencao-fundo px-2 py-0.5 text-left text-[0.6875rem] leading-4 font-semibold text-atencao shadow-[0_7px_16px_-15px_rgba(8,41,76,.35)] [&_svg]:shrink-0",
        className,
      )}
    >
      <PencilLine aria-hidden="true" size={11} strokeWidth={1.85} />
      <span className="min-w-0 break-words">Taxa alterada manualmente</span>
    </span>
  );
}
