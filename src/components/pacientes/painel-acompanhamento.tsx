import { CalendarCheck2, CircleCheck, Repeat2, Wallet } from "lucide-react";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { PrioridadeTag } from "@/components/ui/priority-tag";
import { cn } from "@/lib/cn";
import { descreverPrazo, formatarData, formatarMoeda } from "@/lib/format";
import { ROTULO_PENDENCIA } from "@/server/consultas/pendencias";
import { ROTULO_ACOMPANHAMENTO } from "@/server/consultas/retornos";
import type {
  PendenciaDaFicha,
  RetornoDaFicha,
  ResumoFinanceiroPaciente,
} from "@/server/consultas/pacientes";

export function ResumoDaPaciente({
  atendimentos,
  financeiro,
  exemplo,
}: {
  atendimentos: number;
  financeiro: ResumoFinanceiroPaciente;
  exemplo: boolean;
}) {
  const linhas = [
    { rotulo: "Atendimentos", valor: String(atendimentos), icone: CalendarCheck2, tom: "neutro" as const },
    { rotulo: "Recebido", valor: formatarMoeda(financeiro.recebido), icone: Wallet, tom: "positivo" as const },
    { rotulo: "Em aberto", valor: formatarMoeda(financeiro.emAberto), icone: Repeat2, tom: financeiro.emAberto > 0 ? "atencao" as const : "neutro" as const },
  ];

  return (
    <Card>
      <CardCabecalho titulo="Resumo" descricao="Relação operacional da paciente com a clínica." />
      <CardCorpo className="grid grid-cols-3 gap-2.5">
        {linhas.map(({ rotulo, valor, icone: Icone, tom }) => (
          <div key={rotulo} className="min-w-0 rounded-[var(--radius-controle)] border border-card-border/70 bg-surface/58 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-fixed/38 text-primary">
              <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
            </span>
            <p className={cn(
              "tabular mt-3 truncate text-base font-semibold tracking-[-0.02em]",
              tom === "positivo" && "text-positivo",
              tom === "atencao" && "text-atencao",
              tom === "neutro" && "text-on-surface",
            )} title={valor}>
              {valor}
            </p>
            <p className="mt-1 truncate text-[0.66rem] font-medium text-outline">{rotulo}</p>
          </div>
        ))}

        {exemplo ? (
          <p className="col-span-3 border-t border-card-border/70 pt-3 text-[0.625rem] text-outline uppercase">Valores demonstrativos</p>
        ) : null}
      </CardCorpo>
    </Card>
  );
}

export function PendenciasDaPaciente({ pendencias }: { pendencias: PendenciaDaFicha[] }) {
  if (pendencias.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Pendências" />
        <CardCorpo className="flex items-center gap-3 rounded-b-[var(--radius-painel)] text-sm text-on-surface-variant">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-positivo-fundo text-positivo">
            <CircleCheck aria-hidden="true" size={18} strokeWidth={1.6} />
          </span>
          <div>
            <p className="font-medium text-on-surface">Tudo em dia</p>
            <p className="mt-0.5 text-xs text-outline">Nada em aberto para esta paciente.</p>
          </div>
        </CardCorpo>
      </Card>
    );
  }

  return (
    <Card>
      <CardCabecalho titulo="Pendências" descricao={pendencias.length === 1 ? "1 em aberto" : `${pendencias.length} em aberto`} />
      <CardCorpo>
        <Lista rotulo="Pendências da paciente">
          {pendencias.map((pendencia) => (
            <ItemLista key={pendencia.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="rotulo">{ROTULO_PENDENCIA[pendencia.tipo]}</span>
                <PrioridadeTag prioridade={pendencia.prioridade} />
              </div>
              <p className="mt-2 text-sm text-on-surface">{pendencia.descricao}</p>
              {pendencia.prazo ? (
                <p className={cn("mt-1.5 text-xs", (pendencia.prazoEmDias ?? 0) < 0 ? "font-medium text-negativo" : "text-outline") }>
                  Prazo {formatarData(pendencia.prazo)} · {descreverPrazo(pendencia.prazoEmDias ?? 0)}
                </p>
              ) : null}
            </ItemLista>
          ))}
        </Lista>
      </CardCorpo>
    </Card>
  );
}

export function RetornosDaPaciente({ retornos }: { retornos: RetornoDaFicha[] }) {
  if (retornos.length === 0) return null;

  return (
    <Card>
      <CardCabecalho titulo="Retornos" descricao="Períodos sugeridos, ainda em definição pela equipe clínica." />
      <CardCorpo>
        <Lista rotulo="Retornos previstos">
          {retornos.map((retorno) => (
            <ItemLista key={retorno.id}>
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/40 text-primary">
                  <Repeat2 aria-hidden="true" size={15} strokeWidth={1.65} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{retorno.procedimento ?? "Acompanhamento"}</p>
                  <p className={cn("tabular mt-1 text-xs", retorno.emDias < 0 ? "font-medium text-atencao" : "text-outline") }>
                    {formatarData(retorno.sugeridoPara)} · {descreverPrazo(retorno.emDias)}
                  </p>
                  <p className="mt-1 text-xs text-outline">{ROTULO_ACOMPANHAMENTO[retorno.situacao]}</p>
                </div>
              </div>
            </ItemLista>
          ))}
        </Lista>
      </CardCorpo>
    </Card>
  );
}
