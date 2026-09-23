import { CalendarPlus, ClipboardPlus, History } from "lucide-react";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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
    <Card>
      <CardCabecalho
        titulo="Histórico de atendimentos"
        descricao={atendimentos.length === 1 ? "1 atendimento registrado" : `${atendimentos.length} atendimentos registrados`}
        acao={
          <BotaoLink href={`/agenda/novo?paciente=${pacienteId}`} variante="secundaria" tamanho="sm">
            <CalendarPlus aria-hidden="true" size={16} strokeWidth={1.75} />
            Marcar atendimento
          </BotaoLink>
        }
      />

      <CardCorpo>
        {atendimentos.length === 0 ? (
          <EstadoVazio icone={History} titulo="Nenhum atendimento ainda" descricao="Os atendimentos marcados para esta paciente aparecem aqui, do mais recente para o mais antigo." />
        ) : (
          <ol className="relative flex flex-col gap-4 before:absolute before:top-5 before:bottom-5 before:left-[1.05rem] before:w-px before:bg-card-border">
            {atendimentos.map((atendimento, indice) => (
              <li
                key={atendimento.id}
                className="premium-interactive relative flex gap-3 rounded-[var(--radius-painel)] border border-card-border/70 bg-surface/62 px-3.5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] sm:px-4"
              >
                <span className="relative z-[1] mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-card-border bg-surface text-[0.68rem] font-bold text-primary shadow-[var(--shadow-cartao)]">
                  {atendimentos.length - indice}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="font-semibold tracking-[-0.01em] text-on-surface">{atendimento.procedimento}</p>
                      <p className="tabular mt-1 text-xs text-outline">
                        {formatarData(atendimento.inicio)} às {formatarHora(atendimento.inicio)}
                      </p>
                    </div>
                    <SituacaoChip situacao={atendimento.situacao} compacto />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-outline">
                    <span className="rounded-lg bg-surface-container-low/75 px-2.5 py-1">{atendimento.profissional}</span>
                    <span className="tabular rounded-lg bg-surface-container-low/75 px-2.5 py-1">{atendimento.duracaoMin} min</span>
                    <span className="tabular rounded-lg bg-surface-container-low/75 px-2.5 py-1">
                      {formatarMoeda(atendimento.valor)}{exemplo ? " · demonstrativo" : ""}
                    </span>
                  </div>

                  {atendimento.observacoes ? (
                    <p className="mt-3 rounded-[var(--radius-controle)] border border-card-border/60 bg-surface-container-low/42 px-3 py-2.5 text-sm leading-6 text-on-surface-variant">
                      {atendimento.observacoes}
                    </p>
                  ) : null}

                  {podeProntuario ? (
                    <div className="mt-3 border-t border-card-border/65 pt-3">
                      <BotaoLink href={`/prontuarios/novo?atendimento=${atendimento.id}`} variante="contorno" tamanho="sm">
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
    </Card>
  );
}
