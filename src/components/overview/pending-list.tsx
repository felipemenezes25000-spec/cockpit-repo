import { CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { PrioridadeTag } from "@/components/ui/priority-tag";
import { descreverPrazo, formatarData } from "@/lib/format";
import { ROTULO_PENDENCIA, pendenciasAbertas } from "@/server/consultas/pendencias";

const LIMITE = 6;

export async function PendenciasDaClinica() {
  const todas = await pendenciasAbertas();
  const visiveis = todas.slice(0, LIMITE);
  const atrasadas = todas.filter((p) => (p.prazoEmDias ?? 0) < 0).length;

  if (todas.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Pede atenção" />
        <EstadoVazio
          icone={CheckCircle2}
          titulo="Nada em aberto"
          descricao="Quando surgir uma anamnese, um termo ou uma cobrança pendente, ela aparece aqui."
        />
      </Card>
    );
  }

  return (
    <CardRecolhivel
        id="vg-pendencias"
        className="flex flex-col"
        titulo="Pede atenção"
        descricao={
          atrasadas > 0 ? (
            <>
              {todas.length} em aberto ·{" "}
              <span className="font-semibold text-negativo">{atrasadas} fora do prazo</span>
            </>
          ) : (
            `${todas.length} em aberto`
          )
        }
    >

      <CardCorpo className="rolagem-discreta rolagem-esmaecida relative max-h-[560px] flex-1 overflow-y-auto">
        <Lista rotulo="Pendências da clínica">
          {visiveis.map((pendencia) => {
            const atrasada = (pendencia.prazoEmDias ?? 0) < 0;

            return (
              <ItemLista
                key={pendencia.id}
                className={cn(
                  "premium-interactive relative overflow-hidden border bg-surface",
                  atrasada ? "border-negativo-borda" : "border-card-border",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-3 left-0 w-[3px] rounded-r-full",
                    atrasada ? "bg-negativo" : "bg-primary-fixed-dim",
                  )}
                />

                <div className="mb-2 flex items-start justify-between gap-3 pl-1">
                  <span className={cn(
                    "rounded-[var(--radius-tag)] border px-2 py-1 text-[0.625rem] font-bold tracking-wider uppercase",
                    atrasada
                      ? "border-negativo-borda bg-negativo-fundo text-negativo"
                      : "border-card-border bg-surface text-outline",
                  )}>
                    {ROTULO_PENDENCIA[pendencia.tipo]}
                  </span>

                  <Link
                    href={pendencia.destino}
                    aria-label={`Resolver: ${pendencia.descricao}`}
                    className={cn(
                      "group inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-controle)] px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.985]",
                      atrasada
                        ? "border border-primary-container bg-primary-container text-on-primary hover:bg-primary-hover"
                        : "border border-borda-controle bg-surface text-primary hover:border-primary-container hover:bg-selecao",
                    )}
                  >
                    Resolver
                    <ChevronRight aria-hidden="true" size={14} strokeWidth={1.75} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </div>

                {pendencia.paciente ? (
                  <p className="mb-1 pl-1 text-sm font-semibold break-words text-on-surface">
                    {pendencia.paciente}
                  </p>
                ) : null}

                <p className="mb-3 pl-1 text-sm leading-5 text-on-surface-variant">
                  {pendencia.descricao}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-1">
                  <PrioridadeTag prioridade={pendencia.prioridade} />
                  {pendencia.prazo ? (
                    <span
                      className={cn(
                        "tabular text-xs",
                        atrasada ? "font-semibold text-negativo" : "text-outline",
                      )}
                    >
                      {atrasada ? "Venceu " : "Prazo "}
                      {descreverPrazo(pendencia.prazoEmDias ?? 0)} ·{" "}
                      {formatarData(pendencia.prazo)}
                    </span>
                  ) : (
                    <span className="text-xs text-outline">Sem prazo definido</span>
                  )}
                </div>
              </ItemLista>
            );
          })}
        </Lista>
      </CardCorpo>

      {todas.length > LIMITE ? (
        <CardRodape className="relative flex flex-wrap items-center justify-between gap-3">
          <span className="text-outline">
            {todas.length - LIMITE} pendências além destas
          </span>
          <BotaoLink href="/relacionamento" tamanho="sm">
            Ver todas
          </BotaoLink>
        </CardRodape>
      ) : null}
    </CardRecolhivel>
  );
}
