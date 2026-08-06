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
 * Cada situação tem matiz própria E ícone próprio: a cor nunca é a única
 * informação, para quem não a distingue continuar entendendo a agenda.
 *
 * "Confirmado" é o único em contorno, como no mockup — ainda não aconteceu.
 */
export const ESTILO_SITUACAO: Record<SituacaoAtendimento, Estilo> = {
  agendado: {
    rotulo: "Agendado",
    icone: Circle,
    classes: "bg-sit-agendado-fundo text-sit-agendado",
    marcador: "bg-outline-variant",
  },
  aguardando_confirmacao: {
    rotulo: "Aguardando confirmação",
    icone: Clock3,
    classes: "bg-sit-aguardando-fundo text-sit-aguardando",
    marcador: "bg-sit-aguardando",
  },
  confirmado: {
    rotulo: "Confirmado",
    icone: Check,
    classes: "border border-outline-variant bg-sit-confirmado-fundo text-sit-confirmado",
    marcador: "bg-outline-variant",
  },
  em_atendimento: {
    rotulo: "Em atendimento",
    icone: Activity,
    classes: "bg-sit-atendimento-fundo font-semibold text-sit-atendimento",
    marcador: "bg-primary-container",
  },
  concluido: {
    rotulo: "Concluído",
    icone: CheckCheck,
    classes: "bg-sit-concluido-fundo text-sit-concluido",
    marcador: "bg-secondary-fixed-dim",
  },
  cancelado: {
    rotulo: "Cancelado",
    icone: X,
    classes: "bg-sit-cancelado-fundo text-sit-cancelado",
    marcador: "bg-sit-cancelado",
  },
  ausente: {
    rotulo: "Paciente não compareceu",
    icone: Slash,
    classes: "bg-sit-ausente-fundo text-sit-ausente",
    marcador: "bg-sit-ausente",
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
