import { Ban, CircleCheck, Clock3, Replace } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  rotuloDaSituacao,
  ROTULO_TIPO,
  type SituacaoDocumento,
  type TipoDocumento,
} from "@/lib/documento";

/**
 * A situação do documento, com a semântica de cor do projeto.
 *
 * "Aguardando assinatura" é laranja, não vermelho: falta alguém fazer alguma
 * coisa, e isso não é erro. Cancelado e substituído ficam em neutro pelo mesmo
 * motivo invertido — são desfechos normais, não falhas. O vermelho continua
 * reservado para o que deu errado, e aqui nada deu.
 *
 * Cor nunca comunica sozinha: cada situação leva ícone e rótulo próprios.
 */
const ESTILO: Record<
  SituacaoDocumento,
  { icone: LucideIcon; classes: string }
> = {
  emitido: {
    icone: Clock3,
    classes: "bg-atencao-fundo text-atencao",
  },
  assinado: {
    icone: CircleCheck,
    classes: "border border-positivo-borda bg-positivo-fundo text-positivo",
  },
  cancelado: {
    icone: Ban,
    classes: "border border-outline-variant bg-surface-container-low text-outline",
  },
  substituido: {
    icone: Replace,
    classes: "border border-outline-variant bg-surface-container-low text-outline",
  },
};

export function MarcaSituacao({
  situacao,
  tipo,
  className,
}: {
  situacao: SituacaoDocumento;
  /** O rótulo muda: anamnese não aguarda assinatura, está em preenchimento. */
  tipo: TipoDocumento;
  className?: string;
}) {
  const estilo = ESTILO[situacao];
  const Icone = estilo.icone;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] px-2 py-1 text-xs font-medium",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.75} />
      {rotuloDaSituacao(situacao, tipo)}
    </span>
  );
}

export function MarcaTipo({ tipo }: { tipo: TipoDocumento }) {
  return (
    <span className="rounded-[var(--radius-tag)] bg-secondary-fixed px-2 py-1 text-xs font-medium text-primary">
      {ROTULO_TIPO[tipo]}
    </span>
  );
}
