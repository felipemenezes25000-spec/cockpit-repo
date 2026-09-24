import {
  Activity,
  CalendarClock,
  Check,
  CheckCheck,
  Circle,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { PROXIMAS_SITUACOES, VERBO_SITUACAO } from "@/lib/atendimento";
import type { SituacaoAtendimento } from "@/lib/dominio";
import { mudarSituacao } from "@/server/acoes/agenda";

const TOM: Partial<Record<SituacaoAtendimento, "positivo" | "informativo" | "negativo">> = {
  confirmado: "positivo",
  em_atendimento: "informativo",
  concluido: "positivo",
  cancelado: "negativo",
  ausente: "negativo",
};

const ICONE: Record<SituacaoAtendimento, LucideIcon> = {
  agendado: Circle,
  aguardando_confirmacao: CalendarClock,
  confirmado: Check,
  em_atendimento: Activity,
  concluido: CheckCheck,
  cancelado: X,
  ausente: UserX,
};

const CONFIRMAR: Partial<Record<SituacaoAtendimento, string>> = {
  cancelado: "Cancelar este atendimento? O horário fica livre para outra marcação.",
  ausente: "Registrar que a paciente não compareceu?",
};

export function BotoesSituacao({
  atendimentoId,
  situacao,
  paciente,
  compacto = false,
}: {
  atendimentoId: string;
  situacao: SituacaoAtendimento;
  paciente?: string;
  compacto?: boolean;
}) {
  const proximas = PROXIMAS_SITUACOES[situacao];
  if (proximas.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start gap-2">
      {proximas.map((para) => {
        const Icone = ICONE[para];
        return (
          <FormularioDeAcao
            key={para}
            acao={mudarSituacao}
            campos={{ id: atendimentoId, para }}
            confirmacao={CONFIRMAR[para]}
          >
            <BotaoDeAcao
              tom={TOM[para] ?? "neutro"}
              tamanho={compacto ? "xs" : "sm"}
              icone={<Icone aria-hidden="true" strokeWidth={1.8} />}
              rotuloAcessivel={paciente ? `${VERBO_SITUACAO[para]}: ${paciente}` : undefined}
            >
              {VERBO_SITUACAO[para]}
            </BotaoDeAcao>
          </FormularioDeAcao>
        );
      })}
    </div>
  );
}
