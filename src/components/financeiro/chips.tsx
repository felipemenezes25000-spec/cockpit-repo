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
  previsto: { icone: Clock3, classes: "bg-informativo-fundo text-informativo-texto" },
  pendente: { icone: TriangleAlert, classes: "bg-atencao-fundo text-atencao" },
  recebido: { icone: Check, classes: "bg-positivo-fundo text-positivo" },
  recebido_divergencia: { icone: CircleAlert, classes: "bg-atencao-fundo text-atencao" },
  cancelado: { icone: Ban, classes: "bg-negativo-fundo text-negativo" },
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
        "inline-flex items-center gap-1 rounded-[var(--radius-controle)] px-2 py-0.5 text-xs whitespace-nowrap",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.75} />
      {ROTULO_SITUACAO_RECEBIMENTO[situacao]}
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
    ? { icone: TriangleAlert, classes: "bg-negativo-fundo text-negativo" }
    : situacao === "paga"
      ? { icone: Check, classes: "bg-positivo-fundo text-positivo" }
      : situacao === "cancelada"
        ? { icone: Ban, classes: "bg-surface-container text-on-surface-variant" }
        : { icone: Clock3, classes: "bg-atencao-fundo text-atencao" };

  const Icone = estilo.icone;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-controle)] px-2 py-0.5 text-xs whitespace-nowrap",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.75} />
      {vencida ? "Vencida" : ROTULO_SITUACAO_DESPESA[situacao]}
    </span>
  );
}

/** Marca de taxa alterada manualmente — sempre visível onde a taxa aparece. */
export function MarcaTaxaManual({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-atencao-fundo px-1.5 py-0.5 text-[0.6875rem] font-medium text-atencao",
        className,
      )}
    >
      <PencilLine aria-hidden="true" size={11} strokeWidth={1.75} />
      Taxa alterada manualmente
    </span>
  );
}
