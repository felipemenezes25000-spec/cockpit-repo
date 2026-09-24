import { BarChart3, CalendarCheck2, Filter, Route, type LucideIcon } from "lucide-react";
import { Card, CardCorpo } from "@/components/ui/card";
import type { OrigemDoPainel } from "@/server/consultas/captacao";

function Taxa({ icone: Icone, rotulo, valor }: { icone: LucideIcon; rotulo: string; valor: number }) {
  return (
    <div className="flex items-start gap-3 border-b border-card-border py-4 first:pt-0 last:border-0 last:pb-0">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary">
        <Icone size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-5 text-on-surface-variant">{rotulo}</p>
        <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] tabular-nums text-on-surface">{valor.toLocaleString("pt-BR")}%</p>
      </div>
    </div>
  );
}

export function MetricasCaptacao({
  taxaGeral,
  taxaAgendamentoVenda,
  origens,
  perdidos,
}: {
  taxaGeral: number;
  taxaAgendamentoVenda: number;
  origens: OrigemDoPainel[];
  perdidos: number;
}) {
  const maximo = Math.max(...origens.map((o) => o.quantidade), 1);

  return (
    <Card className="h-full">
      <CardCorpo className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary">
            <BarChart3 size={20} strokeWidth={1.9} />
          </span>
          <div>
            <p className="rotulo text-primary">Conversão</p>
            <h2 className="titulo-secao mt-1">Onde o funil rende</h2>
          </div>
        </div>

        <div className="mt-5">
          <Taxa icone={Filter} rotulo="Conversão geral · lead → venda" valor={taxaGeral} />
          <Taxa icone={CalendarCheck2} rotulo="Fechamento · agendamento → venda" valor={taxaAgendamentoVenda} />
        </div>

        <div className="mt-5 border-t border-card-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="rotulo text-primary">Origem dos leads</p>
              <p className="mt-1 text-xs text-outline">Distribuição das entradas no período.</p>
            </div>
            <Route aria-hidden="true" size={18} className="text-outline" />
          </div>

          {origens.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {origens.slice(0, 5).map((origem) => (
                <li key={origem.origem}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-on-surface-variant">{origem.origem}</span>
                    <span className="shrink-0 tabular-nums text-outline">{origem.quantidade} · {origem.percentual.toLocaleString("pt-BR")}%</span>
                  </div>
                  <span className="barra barra-fina">
                    <span className="chart-grow" style={{ width: `${(origem.quantidade / maximo) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-[var(--radius-cartao)] border border-dashed border-card-border px-3 py-4 text-xs leading-5 text-outline">
              As origens aparecem assim que os primeiros leads entrarem no período.
            </p>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-3.5 py-3">
            <p className="text-xs text-outline">Perdidos no período</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-on-surface">{perdidos.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </CardCorpo>
    </Card>
  );
}
