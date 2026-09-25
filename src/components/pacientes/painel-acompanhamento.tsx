import { CalendarCheck2, CircleCheck, Repeat2, Wallet } from "lucide-react";
import { CardCorpo } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
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
    <CardRecolhivel id="pac-resumo" titulo="Resumo" descricao="Relação operacional da paciente com a clínica."
    >
      {/* Linhas rótulo → valor, e não três colunas: a coluna da ficha é
          estreita, e em colunas o valor em reais virava "R$ 1…". Dinheiro
          nunca é cortado. */}
      <CardCorpo className="py-3">
        <dl className="flex flex-col divide-y divide-card-border">
          {linhas.map(({ rotulo, valor, icone: Icone, tom }) => (
            <div key={rotulo} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <dt className="flex min-w-0 flex-1 items-center gap-2.5 text-sm text-on-surface-variant">
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <Icone size={14} strokeWidth={1.75} />
                </span>
                {rotulo}
              </dt>
              <dd className={cn(
                "tabular text-base font-semibold whitespace-nowrap tracking-[-0.02em]",
                tom === "positivo" && "text-positivo",
                tom === "atencao" && "text-atencao",
                tom === "neutro" && "text-on-surface",
              )}>
                {valor}
              </dd>
            </div>
          ))}
        </dl>

        {exemplo ? (
          <p className="border-t border-card-border pt-3 text-[0.625rem] text-outline uppercase">Valores demonstrativos</p>
        ) : null}
      </CardCorpo>
    </CardRecolhivel>
  );
}

export function PendenciasDaPaciente({ pendencias }: { pendencias: PendenciaDaFicha[] }) {
  if (pendencias.length === 0) {
    return (
      <CardRecolhivel id="pac-pendencias" titulo="Pendências"
      >
        <CardCorpo className="flex items-center gap-3 rounded-b-[var(--radius-painel)] text-sm text-on-surface-variant">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-positivo-fundo text-positivo">
            <CircleCheck aria-hidden="true" size={18} strokeWidth={1.6} />
          </span>
          <div>
            <p className="font-medium text-on-surface">Tudo em dia</p>
            <p className="mt-0.5 text-xs text-outline">Nada em aberto para esta paciente.</p>
          </div>
        </CardCorpo>
      </CardRecolhivel>
    );
  }

  return (
    <CardRecolhivel id="pac-pendencias-2" titulo="Pendências" descricao={pendencias.length === 1 ? "1 em aberto" : `${pendencias.length} em aberto`}
    >
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
    </CardRecolhivel>
  );
}

export function RetornosDaPaciente({ retornos }: { retornos: RetornoDaFicha[] }) {
  if (retornos.length === 0) return null;

  return (
    <CardRecolhivel id="pac-retornos" titulo="Retornos" descricao="Períodos sugeridos, ainda em definição pela equipe clínica."
    >
      <CardCorpo>
        <Lista rotulo="Retornos previstos">
          {retornos.map((retorno) => (
            <ItemLista key={retorno.id}>
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
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
    </CardRecolhivel>
  );
}
