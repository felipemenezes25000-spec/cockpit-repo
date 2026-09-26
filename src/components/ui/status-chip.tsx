import { Activity, Check, CheckCheck, Circle, Clock3, Slash, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SituacaoAtendimento } from "@/lib/dominio";

type Estilo = {
  rotulo: string;
  icone: LucideIcon;
  classes: string;
  marcador: string;
};

export const ESTILO_SITUACAO: Record<SituacaoAtendimento, Estilo> = {
  agendado: {
    rotulo: "Agendado",
    icone: Circle,
    classes: "border border-informativo-borda bg-informativo-fundo text-informativo-texto",
    marcador: "bg-informativo-borda",
  },
  aguardando_confirmacao: {
    rotulo: "Aguardando confirmação",
    icone: Clock3,
    classes: "border border-atencao-borda bg-atencao-fundo text-atencao",
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
    classes: "border border-informativo bg-informativo text-on-primary",
    marcador: "bg-on-primary",
  },
  concluido: {
    rotulo: "Concluído",
    icone: CheckCheck,
    classes: "border border-positivo-borda bg-positivo-fundo text-positivo",
    marcador: "bg-positivo-borda",
  },
  cancelado: {
    rotulo: "Cancelado",
    icone: X,
    classes: "border border-negativo-borda bg-negativo-fundo text-negativo",
    marcador: "bg-negativo",
  },
  ausente: {
    rotulo: "Paciente não compareceu",
    icone: Slash,
    classes: "border border-dashed border-negativo bg-surface text-negativo",
    marcador: "bg-negativo-borda",
  },
};

export function SituacaoChip({
  situacao,
  compacto = false,
  className,
}: {
  situacao: SituacaoAtendimento;
  compacto?: boolean;
  className?: string;
}) {
  const estilo = ESTILO_SITUACAO[situacao];
  const Icone = estilo.icone;
  const rotulo = compacto && situacao === "ausente" ? "Não compareceu" : estilo.rotulo;

  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-left text-[0.75rem] leading-4 font-semibold shadow-[0_7px_16px_-15px_rgba(8,41,76,.45)] [&_svg]:shrink-0",
        compacto ? "whitespace-nowrap" : "break-words whitespace-normal",
        estilo.classes,
        className,
      )}
    >
      {situacao === "em_atendimento" ? (
        <span aria-hidden="true" className="now-pulse size-1.5 shrink-0 rounded-full bg-on-primary" />
      ) : null}
      <Icone aria-hidden="true" size={13} strokeWidth={2} />
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
