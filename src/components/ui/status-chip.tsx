import { Activity, Check, CheckCheck, Circle, Clock3, Slash, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SituacaoAtendimento } from "@/lib/dominio";

type Estilo = {
  rotulo: string;
  icone: LucideIcon;
  classes: string;
  /** Cor do ponto sobre a linha do tempo da agenda. */
  marcador: string;
};

/**
 * Cada situação recebe a semântica que ela realmente tem:
 *
 * | Situação                | Semântica   | Por quê |
 * |-------------------------|-------------|---------|
 * | Agendado                | informativo | Só informa: nada a fazer ainda |
 * | Aguardando confirmação  | atenção     | Falta alguém ligar. Não é erro |
 * | Confirmado              | positivo    | Deu certo |
 * | Em atendimento          | informativo | Está acontecendo agora |
 * | Concluído               | positivo    | Terminou bem |
 * | Cancelado               | negativo    | Perdeu-se o horário |
 * | Não compareceu          | negativo    | Perdeu-se o horário sem aviso |
 *
 * Cancelado e não compareceu dividem o vermelho porque as duas são a mesma
 * má notícia. O que as separa é o ícone, o rótulo e o preenchimento: cancelado
 * vem sólido, ausência vem em contorno. Cor nunca decide sozinha.
 *
 * "Em atendimento" é o único preenchido com a cor cheia — é o que está
 * acontecendo neste minuto e precisa saltar na lista.
 */
export const ESTILO_SITUACAO: Record<SituacaoAtendimento, Estilo> = {
  agendado: {
    rotulo: "Agendado",
    icone: Circle,
    classes: "bg-informativo-fundo text-informativo-texto",
    marcador: "bg-informativo-borda",
  },
  aguardando_confirmacao: {
    rotulo: "Aguardando confirmação",
    icone: Clock3,
    classes: "bg-atencao-fundo text-atencao",
    marcador: "bg-atencao-acento",
  },
  confirmado: {
    rotulo: "Confirmado",
    icone: Check,
    classes: "border border-positivo-borda bg-positivo-fundo text-positivo",
    marcador: "bg-positivo",
  },
  em_atendimento: {
    rotulo: "Em atendimento",
    icone: Activity,
    classes: "bg-informativo font-semibold text-on-primary",
    marcador: "bg-informativo",
  },
  concluido: {
    rotulo: "Concluído",
    icone: CheckCheck,
    classes: "bg-positivo-fundo text-positivo",
    marcador: "bg-positivo-borda",
  },
  cancelado: {
    rotulo: "Cancelado",
    icone: X,
    classes: "bg-negativo-fundo text-negativo",
    marcador: "bg-negativo",
  },
  ausente: {
    rotulo: "Paciente não compareceu",
    icone: Slash,
    classes: "border border-negativo-borda bg-surface text-negativo",
    marcador: "bg-negativo-borda",
  },
};

export function SituacaoChip({
  situacao,
  compacto = false,
  className,
}: {
  situacao: SituacaoAtendimento;
  /** Encurta "Paciente não compareceu" para caber em listas estreitas. */
  compacto?: boolean;
  className?: string;
}) {
  const estilo = ESTILO_SITUACAO[situacao];
  const Icone = estilo.icone;
  const rotulo = compacto && situacao === "ausente" ? "Não compareceu" : estilo.rotulo;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-controle)] px-2 py-0.5 text-xs whitespace-nowrap",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
      {rotulo}
    </span>
  );
}

export const SITUACOES_EM_ORDEM: SituacaoAtendimento[] = [
  "agendado",
  "aguardando_confirmacao",
  "confirmado",
  "em_atendimento",
  "concluido",
  "cancelado",
  "ausente",
];
