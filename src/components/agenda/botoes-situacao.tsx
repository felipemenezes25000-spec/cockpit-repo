import { mudarSituacao } from "@/server/acoes/agenda";
import { PROXIMAS_SITUACOES, VERBO_SITUACAO } from "@/lib/atendimento";
import { cn } from "@/lib/cn";
import type { SituacaoAtendimento } from "@/lib/dominio";

/** Tom do botão conforme para onde ele leva. */
const TOM: Partial<Record<SituacaoAtendimento, string>> = {
  confirmado: "border-positivo-borda text-positivo hover:bg-positivo-fundo",
  em_atendimento: "border-informativo-borda text-informativo-texto hover:bg-informativo-fundo",
  concluido: "border-positivo-borda text-positivo hover:bg-positivo-fundo",
  cancelado: "border-negativo-borda text-negativo hover:bg-negativo-fundo",
  ausente: "border-negativo-borda text-negativo hover:bg-negativo-fundo",
};

/**
 * Os próximos passos de um atendimento, como formulários de verdade — cada
 * botão envia a ação sem depender de JavaScript. A trilha é gravada por
 * gatilho no banco, com autor e hora.
 */
export function BotoesSituacao({
  atendimentoId,
  situacao,
  compacto = false,
}: {
  atendimentoId: string;
  situacao: SituacaoAtendimento;
  compacto?: boolean;
}) {
  const proximas = PROXIMAS_SITUACOES[situacao];
  if (proximas.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {proximas.map((para) => (
        <form key={para} action={mudarSituacao}>
          <input type="hidden" name="id" value={atendimentoId} />
          <input type="hidden" name="para" value={para} />
          <button
            type="submit"
            className={cn(
              "inline-flex items-center justify-center rounded-[var(--radius-cartao)] border bg-surface font-medium transition-colors",
              compacto ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
              TOM[para] ??
                "border-card-border text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
            )}
          >
            {VERBO_SITUACAO[para]}
          </button>
        </form>
      ))}
    </div>
  );
}
