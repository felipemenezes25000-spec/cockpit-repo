import { CalendarPlus, History } from "lucide-react";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { formatarData, formatarHora, formatarMoeda } from "@/lib/format";
import type { AtendimentoDoHistorico } from "@/server/consultas/pacientes";

/**
 * Atendimentos do mais recente para o mais antigo, sobre uma linha vertical.
 *
 * Repete a leitura da Linha do Dia da Visão Geral — mesma gramática visual, em
 * escala de meses em vez de horas.
 */
export function HistoricoAtendimentos({
  atendimentos,
  exemplo,
  pacienteId,
}: {
  atendimentos: AtendimentoDoHistorico[];
  exemplo: boolean;
  pacienteId: string;
}) {
  return (
    <Card>
      <CardCabecalho
        titulo="Histórico de atendimentos"
        descricao={
          atendimentos.length === 1
            ? "1 atendimento registrado"
            : `${atendimentos.length} atendimentos registrados`
        }
        acao={
          <BotaoLink
            href={`/agenda/novo?paciente=${pacienteId}`}
            variante="secundaria"
            tamanho="sm"
          >
            <CalendarPlus aria-hidden="true" size={16} strokeWidth={1.75} />
            Marcar atendimento
          </BotaoLink>
        }
      />

      <CardCorpo>
        {atendimentos.length === 0 ? (
          <EstadoVazio
            icone={History}
            titulo="Nenhum atendimento ainda"
            descricao="Quando o módulo Agenda estiver pronto, os atendimentos desta paciente aparecem aqui."
          />
        ) : (
          <ol className="relative flex flex-col gap-6 border-l border-outline-variant pl-6">
            {atendimentos.map((atendimento) => (
              <li key={atendimento.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[1.8125rem] size-2 rounded-full bg-outline-variant ring-4 ring-card"
                />

                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-medium text-on-surface">
                    {atendimento.procedimento}
                  </p>
                  <span className="tabular text-sm text-outline">
                    {formatarData(atendimento.inicio)} às{" "}
                    {formatarHora(atendimento.inicio)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-outline">
                  <SituacaoChip situacao={atendimento.situacao} compacto />
                  <span>{atendimento.profissional}</span>
                  <span className="tabular">{atendimento.duracaoMin} min</span>
                  <span className="tabular">
                    {formatarMoeda(atendimento.valor)}
                    {exemplo ? (
                      <span className="ml-1 text-outline-variant">
                        (demonstrativo)
                      </span>
                    ) : null}
                  </span>
                </div>

                {atendimento.observacoes ? (
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {atendimento.observacoes}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardCorpo>
    </Card>
  );
}
