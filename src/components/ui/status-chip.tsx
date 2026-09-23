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
    classes: "border border-informativo-borda/75 bg-informativo-fundo/72 text-informativo-texto",
    marcador: "bg-informativo-borda",
  },
  aguardando_confirmacao: {
    rotulo: "Aguardando confirmação",
    icone: Clock3,
    classes: "border border-atencao-borda/80 bg-atencao-fundo/78 text-atencao",
    marcador: "bg-atencao-acento",
  },
  confirmado: {
    rotulo: "Confirmado",
    icone: Check,
    classes: "border border-positivo-borda/85 bg-positivo-fundo/78 text-positivo",
    marcador: "bg-positivo",
  },
  em_atendimento: {
    rotulo: "Em atendimento",
    icone: Activity,
    classes: "border border-informativo bg-informativo font-semibold text-on-primary shadow-[0_5px_14px_-9px_rgba(10,110,209,0.7)]",
    marcador: "bg-informativo",
  },
  concluido: {
    rotulo: "Concluído",
    icone: CheckCheck,
    classes: "border border-positivo-borda/75 bg-positivo-fundo/72 text-positivo",
    marcador: "bg-positivo-borda",
  },
  cancelado: {
    rotulo: "Cancelado",
    icone: X,
    classes: "border border-negativo-borda/75 bg-negativo-fundo/72 text-negativo",
    marcador: "bg-negativo",
  },
  ausente: {
    rotulo: "Paciente não compareceu",
    icone: Slash,
    classes: "border border-negativo-borda/85 bg-surface/80 text-negativo",
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
        "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" size={13} strokeWidth={1.8} />
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
