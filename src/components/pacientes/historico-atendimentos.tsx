import { CalendarPlus, ClipboardPlus, History } from "lucide-react";
import { BotaoLink } from "@/components/ui/button";
import { CardCorpo } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { formatarData, formatarHora, formatarMoeda } from "@/lib/format";
import type { AtendimentoDoHistorico } from "@/server/consultas/pacientes";

export function HistoricoAtendimentos({
  atendimentos,
  exemplo,
  pacienteId,
  podeProntuario = false,
}: {
  atendimentos: AtendimentoDoHistorico[];
  exemplo: boolean;
  pacienteId: string;
  podeProntuario?: boolean;
}) {
  return (
    <CardRecolhivel id="pac-historico-de-atendimentos"
        titulo="Histórico de atendimentos"
        descricao={atendimentos.length === 1 ? "1 atendimento registrado" : `${atendimentos.length} atendimentos registrados`}
        acao={
          <BotaoLink href={`/agenda/novo?paciente=${pacienteId}`} variante="secundaria" tamanho="sm">
            <CalendarPlus aria-hidden="true" size={16} strokeWidth={1.75} />
            Marcar atendimento
          </BotaoLink>
        }
    >

      <CardCorpo>
        {atendimentos.length === 0 ? (
          <EstadoVazio icone={History} titulo="Nenhum atendimento ainda" descricao="Os atendimentos marcados para esta paciente aparecem aqui, do mais recente para o mais antigo." />
        ) : (
          <ol className="relative flex min-w-0 flex-col gap-4 before:absolute before:top-5 before:bottom-5 before:left-[1.05rem] before:w-px before:bg-card-border">
            {atendimentos.map((atendimento, indice) => (
              <li
                key={atendimento.id}
                className="premium-interactive relative flex min-w-0 gap-3 rounded-[var(--radius-painel)] border border-card-border bg-surface px-3.5 py-4 sm:px-4"
              >
                <span className="relative z-[1] mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-[0.68rem] font-bold text-primary">
                  {atendimentos.length - indice}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold tracking-[-0.01em] text-on-surface">{atendimento.procedimento}</p>
                      <p className="tabular mt-1 text-xs text-outline">
                        {formatarData(atendimento.inicio)} às {formatarHora(atendimento.inicio)}
                      </p>
                    </div>
                    <SituacaoChip situacao={atendimento.situacao} compacto className="shrink-0" />
                  </div>

                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs text-outline">
                    <span className="max-w-full break-words rounded-[var(--radius-controle)] bg-surface-container-low px-2.5 py-1">{atendimento.profissional}</span>
                    <span className="tabular rounded-[var(--radius-controle)] bg-surface-container-low px-2.5 py-1">{atendimento.duracaoMin} min</span>
                    <span className="tabular rounded-[var(--radius-controle)] bg-surface-container-low px-2.5 py-1">
                      {formatarMoeda(atendimento.valor)}{exemplo ? " · demonstrativo" : ""}
                    </span>
                  </div>

                  {atendimento.observacoes ? (
                    <p className="mt-3 max-w-full break-words whitespace-pre-wrap rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-3 py-2.5 text-sm leading-6 text-on-surface-variant">
                      {atendimento.observacoes}
                    </p>
                  ) : null}

                  {podeProntuario ? (
                    <div className="mt-3 grid grid-cols-1 border-t border-card-border pt-3 sm:flex">
                      <BotaoLink href={`/prontuarios/novo?atendimento=${atendimento.id}`} variante="contorno" tamanho="sm" className="w-full sm:w-auto">
                        <ClipboardPlus aria-hidden="true" size={16} strokeWidth={1.75} />
                        Registrar prontuário
                      </BotaoLink>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardCorpo>
    </CardRecolhivel>
  );
}
