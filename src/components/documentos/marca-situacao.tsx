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
    classes: "border border-atencao-borda bg-atencao-fundo text-atencao",
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
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-left text-xs leading-4 font-medium shadow-[0_7px_16px_-15px_rgba(8,41,76,.35)] [&_svg]:shrink-0",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.75} />
      <span className="min-w-0 break-words">{rotuloDaSituacao(situacao, tipo)}</span>
    </span>
  );
}

export function MarcaTipo({ tipo }: { tipo: TipoDocumento }) {
  return (
    <span className="inline-flex min-h-6 max-w-full items-center rounded-full border border-primary-fixed bg-secondary-fixed px-2.5 py-0.5 text-left text-xs leading-4 font-medium text-primary shadow-[0_7px_16px_-15px_rgba(8,41,76,.3)]">
      <span className="min-w-0 break-words">{ROTULO_TIPO[tipo]}</span>
    </span>
  );
}
