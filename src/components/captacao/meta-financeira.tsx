"use client";

import { CircleAlert, LoaderCircle, PencilLine, Target } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardCorpo } from "@/components/ui/card";
import { Campo, classeDeEntrada } from "@/components/ui/field";
import { formatarMoeda } from "@/lib/format";
import type { MetaComercial } from "@/server/consultas/captacao";
import type { PlanoDaMeta } from "@/lib/captacao";
import { salvarMetaComercial, type EstadoMeta } from "@/server/acoes/captacao";

const INICIAL: EstadoMeta = { erros: {} };

function textoNumero(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor);
}

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> : <PencilLine aria-hidden="true" size={16} />}
      {pending ? "Salvando…" : "Salvar meta"}
    </button>
  );
}

export function MetaFinanceira({
  meta,
  faturamentoAtual,
  plano,
  competencia,
  podeEditar,
}: {
  meta: MetaComercial;
  faturamentoAtual: number;
  plano: PlanoDaMeta;
  competencia: string;
  podeEditar: boolean;
}) {
  const [estado, acao] = useActionState(salvarMetaComercial, INICIAL);
  const chave = `${meta.id ?? "nova"}-${meta.metaFaturamento}-${meta.ticketMedioPlanejado}`;

  return (
    <Card className="h-full">
      <CardCorpo className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary">
            <Target size={20} strokeWidth={1.9} />
          </span>
          <div>
            <p className="rotulo text-primary">Meta financeira</p>
            <h2 className="titulo-secao mt-1">O alvo do mês</h2>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-outline">Meta definida</p>
          <p className="numero mt-1 text-on-surface">{formatarMoeda(meta.metaFaturamento)}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-outline">Faturamento atual</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-on-surface">{formatarMoeda(faturamentoAtual)}</p>
            </div>
            <strong className="text-lg font-semibold tabular-nums text-primary">{Math.round(plano.percentualMeta)}%</strong>
          </div>
          <span className="barra mt-3" aria-label={`${Math.round(plano.percentualMeta)}% da meta atingida`}>
            <span style={{ width: `${Math.min(100, plano.percentualMeta)}%` }} />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-y border-card-border py-4">
          <div>
            <p className="text-xs text-outline">Falta faturar</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-on-surface">{formatarMoeda(plano.gapFinanceiro)}</p>
          </div>
          <div>
            <p className="text-xs text-outline">Leads necessários</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">+{plano.leadsNecessarios.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-outline">
          O número de leads é recalculado do fundo para o topo usando ticket e conversões planejadas. Nada desse resultado é salvo manualmente.
        </p>

        {podeEditar ? (
          <details className="group mt-5 border-t border-card-border pt-4" open={meta.id === null}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-controle)] py-2 text-sm font-semibold text-primary focus-visible:outline-2">
              Ajustar meta e premissas
              <PencilLine aria-hidden="true" size={16} className="transition-transform group-open:rotate-[-8deg]" />
            </summary>

            <form key={chave} action={acao} noValidate className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="competencia" value={competencia} />
              <Campo id="meta_faturamento" rotulo="Meta do mês" obrigatorio erro={estado.erros.meta_faturamento}>
                <input
                  id="meta_faturamento"
                  name="meta_faturamento"
                  inputMode="decimal"
                  defaultValue={estado.valores?.meta_faturamento ?? textoNumero(meta.metaFaturamento)}
                  className={classeDeEntrada()}
                />
              </Campo>
              <Campo id="ticket_medio_planejado" rotulo="Ticket médio planejado" obrigatorio erro={estado.erros.ticket_medio_planejado}>
                <input
                  id="ticket_medio_planejado"
                  name="ticket_medio_planejado"
                  inputMode="decimal"
                  defaultValue={estado.valores?.ticket_medio_planejado ?? textoNumero(meta.ticketMedioPlanejado)}
                  className={classeDeEntrada()}
                />
              </Campo>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <Campo id="taxa_lead_qualificado" rotulo="Lead → qualificado" obrigatorio erro={estado.erros.taxa_lead_qualificado}>
                  <input
                    id="taxa_lead_qualificado"
                    name="taxa_lead_qualificado"
                    inputMode="decimal"
                    defaultValue={estado.valores?.taxa_lead_qualificado ?? textoNumero(meta.taxaLeadQualificado)}
                    className={classeDeEntrada({ altura: "compacta" })}
                  />
                </Campo>
                <Campo id="taxa_qualificado_agendamento" rotulo="Qualif. → agenda" obrigatorio erro={estado.erros.taxa_qualificado_agendamento}>
                  <input
                    id="taxa_qualificado_agendamento"
                    name="taxa_qualificado_agendamento"
                    inputMode="decimal"
                    defaultValue={estado.valores?.taxa_qualificado_agendamento ?? textoNumero(meta.taxaQualificadoAgendamento)}
                    className={classeDeEntrada({ altura: "compacta" })}
                  />
                </Campo>
                <Campo id="taxa_agendamento_venda" rotulo="Agenda → venda" obrigatorio erro={estado.erros.taxa_agendamento_venda}>
                  <input
                    id="taxa_agendamento_venda"
                    name="taxa_agendamento_venda"
                    inputMode="decimal"
                    defaultValue={estado.valores?.taxa_agendamento_venda ?? textoNumero(meta.taxaAgendamentoVenda)}
                    className={classeDeEntrada({ altura: "compacta" })}
                  />
                </Campo>
              </div>

              {estado.erros.geral ? (
                <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3 py-2 text-xs leading-5 text-negativo">
                  <CircleAlert aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
                  {estado.erros.geral}
                </p>
              ) : null}
              {estado.sucesso ? <p role="status" className="text-xs font-medium text-positivo">{estado.sucesso}</p> : null}

              <BotaoSalvar />
            </form>
          </details>
        ) : (
          <p className="mt-auto pt-5 text-xs leading-5 text-outline">A meta pode ser alterada pela administradora ou pelo perfil financeiro.</p>
        )}
      </CardCorpo>
    </Card>
  );
}
