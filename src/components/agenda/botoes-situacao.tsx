import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { PROXIMAS_SITUACOES, VERBO_SITUACAO } from "@/lib/atendimento";
import type { SituacaoAtendimento } from "@/lib/dominio";
import { mudarSituacao } from "@/server/acoes/agenda";

/** Tom do botão conforme para onde ele leva. */
const TOM: Partial<Record<SituacaoAtendimento, "positivo" | "informativo" | "negativo">> = {
  confirmado: "positivo",
  em_atendimento: "informativo",
  concluido: "positivo",
  cancelado: "negativo",
  ausente: "negativo",
};

/** Transições que tiram a paciente do horário pedem confirmação. */
const CONFIRMAR: Partial<Record<SituacaoAtendimento, string>> = {
  cancelado: "Cancelar este atendimento? O horário fica livre para outra marcação.",
  ausente: "Registrar que a paciente não compareceu?",
};

/**
 * Os próximos passos de um atendimento, como formulários de verdade — cada
 * botão envia a ação sem depender de JavaScript. A trilha é gravada por
 * gatilho no banco, com autor e hora; se o banco recusar (reabrir num horário
 * que já foi ocupado, por exemplo), a frase aparece ao lado do botão.
 */
export function BotoesSituacao({
  atendimentoId,
  situacao,
  paciente,
  compacto = false,
}: {
  atendimentoId: string;
  situacao: SituacaoAtendimento;
  /** Nome para o leitor de tela saber de quem é cada botão numa lista. */
  paciente?: string;
  compacto?: boolean;
}) {
  const proximas = PROXIMAS_SITUACOES[situacao];
  if (proximas.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start gap-2">
      {proximas.map((para) => (
        <FormularioDeAcao
          key={para}
          acao={mudarSituacao}
          campos={{ id: atendimentoId, para }}
          confirmacao={CONFIRMAR[para]}
        >
          <BotaoDeAcao
            tom={TOM[para] ?? "neutro"}
            tamanho={compacto ? "xs" : "sm"}
            rotuloAcessivel={paciente ? `${VERBO_SITUACAO[para]}: ${paciente}` : undefined}
          >
            {VERBO_SITUACAO[para]}
          </BotaoDeAcao>
        </FormularioDeAcao>
      ))}
    </div>
  );
}
