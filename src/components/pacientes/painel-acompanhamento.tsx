import { CircleCheck, Repeat2 } from "lucide-react";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { PrioridadeTag } from "@/components/ui/priority-tag";
import { descreverPrazo, formatarData, formatarMoeda } from "@/lib/format";
import { ROTULO_PENDENCIA } from "@/server/consultas/pendencias";
import { ROTULO_ACOMPANHAMENTO } from "@/server/consultas/retornos";
import type {
  PendenciaDaFicha,
  RetornoDaFicha,
  ResumoFinanceiroPaciente,
} from "@/server/consultas/pacientes";

/** Três números que resumem a relação da paciente com a clínica. */
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
    { rotulo: "Atendimentos concluídos", valor: String(atendimentos), atencao: false },
    {
      rotulo: "Total recebido",
      valor: formatarMoeda(financeiro.recebido),
      atencao: false,
    },
    {
      rotulo: "Em aberto",
      valor: formatarMoeda(financeiro.emAberto),
      atencao: financeiro.emAberto > 0,
    },
  ];

  return (
    <Card>
      <CardCabecalho titulo="Resumo" />
      <CardCorpo className="flex flex-col gap-4">
        {linhas.map((linha) => (
          <div
            key={linha.rotulo}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="text-sm text-on-surface-variant">{linha.rotulo}</span>
            <span
              className={`tabular font-medium ${
                linha.atencao ? "text-atencao" : "text-on-surface"
              }`}
            >
              {linha.valor}
            </span>
          </div>
        ))}

        {exemplo ? (
          <p className="border-t border-card-border pt-3 text-[0.625rem] text-outline uppercase">
            Valores demonstrativos
          </p>
        ) : null}
      </CardCorpo>
    </Card>
  );
}

export function PendenciasDaPaciente({
  pendencias,
}: {
  pendencias: PendenciaDaFicha[];
}) {
  if (pendencias.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Pendências" />
        <CardCorpo className="flex items-center gap-3 text-sm text-on-surface-variant">
          <CircleCheck
            aria-hidden="true"
            size={18}
            strokeWidth={1.5}
            className="shrink-0 text-outline-variant"
          />
          Nada em aberto para esta paciente.
        </CardCorpo>
      </Card>
    );
  }

  return (
    <Card>
      <CardCabecalho
        titulo="Pendências"
        descricao={
          pendencias.length === 1 ? "1 em aberto" : `${pendencias.length} em aberto`
        }
      />
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
                <p
                  className={`mt-1.5 text-xs ${
                    (pendencia.prazoEmDias ?? 0) < 0 ? "text-negativo" : "text-outline"
                  }`}
                >
                  Prazo {formatarData(pendencia.prazo)} ·{" "}
                  {descreverPrazo(pendencia.prazoEmDias ?? 0)}
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
      <CardCabecalho
        titulo="Retornos"
        descricao="Períodos sugeridos, ainda em definição pela equipe clínica."
      />
      <CardCorpo>
        <Lista rotulo="Retornos previstos">
          {retornos.map((retorno) => (
            <ItemLista key={retorno.id}>
              <div className="flex items-start gap-3">
                <Repeat2
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0 text-outline-variant"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface">
                    {retorno.procedimento ?? "Acompanhamento"}
                  </p>
                  <p
                    className={`tabular mt-1 text-xs ${
                      retorno.emDias < 0 ? "text-atencao" : "text-outline"
                    }`}
                  >
                    {formatarData(retorno.sugeridoPara)} ·{" "}
                    {descreverPrazo(retorno.emDias)}
                  </p>
                  <p className="mt-1 text-xs text-outline">
                    {ROTULO_ACOMPANHAMENTO[retorno.situacao]}
                  </p>
                </div>
              </div>
            </ItemLista>
          ))}
        </Lista>
      </CardCorpo>
    </Card>
  );
}
