import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { capitalizar, formatarMesCurto, formatarMoeda, formatarMoedaCompacta } from "@/lib/format";
import { mesmoMes } from "@/lib/dates";
import type { PontoMensal } from "@/server/consultas/financeiro";

export function EvolucaoRecebimentos({ serie, exemplo }: { serie: PontoMensal[]; exemplo: boolean }) {
  const teto = Math.max(...serie.map((p) => p.recebido), 1);
  const agora = new Date();
  const atual = serie.find((ponto) => mesmoMes(ponto.data, agora)) ?? serie[serie.length - 1];
  const pico = serie.reduce((maior, ponto) => ponto.recebido > maior.recebido ? ponto : maior, serie[0]);
  const hachura = "bg-primary-fixed [background-image:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--color-primary-container)_40%,transparent)_4px_5px)]";

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="rotulo">Recebido por mês</span>
        <span className="text-xs text-outline">últimos 6 meses{exemplo ? " · valores demonstrativos" : ""}</span>
      </figcaption>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:max-w-lg">
        <div className="rounded-[var(--radius-cartao)] border border-primary-fixed bg-selecao px-3 py-2.5">
          <p className="text-[0.62rem] font-semibold tracking-[0.06em] text-outline uppercase">Mês atual</p>
          <p className="tabular mt-1 text-sm font-semibold text-primary">{formatarMoeda(atual?.recebido ?? 0)}</p>
        </div>
        <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 py-2.5">
          <p className="text-[0.62rem] font-semibold tracking-[0.06em] text-outline uppercase">Maior no período</p>
          <p className="tabular mt-1 text-sm font-semibold text-on-surface">{formatarMoeda(pico?.recebido ?? 0)}</p>
        </div>
      </div>

      <div className="relative mt-4 rounded-[var(--radius-painel)] border border-card-border bg-surface px-3 pt-4 pb-3 sm:px-4">
        <ul className="flex h-[154px] items-end gap-2 sm:gap-3">
          {serie.map((ponto, indice) => {
            const emAndamento = mesmoMes(ponto.data, agora);
            const ehPico = ponto === pico && pico.recebido > 0;
            const altura = Math.max(4, Math.round((ponto.recebido / teto) * 100));
            const mes = capitalizar(formatarMesCurto(ponto.data).replace(".", ""));

            return (
              <li
                key={ponto.data.toISOString()}
                className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                aria-label={`${mes}: ${formatarMoeda(ponto.recebido)}${emAndamento ? " (mês em andamento)" : ""}${ehPico ? " (maior valor do período)" : ""}`}
              >
                {/* Abaixo de 640 px cada barra tem uns 33 px e o valor virava
                    "R$ 27.3…": o rótulo some (fica o espaço), e o mês atual e o
                    maior do período seguem inteiros nos quadros de cima. */}
                <span className={cn(
                  "tabular mb-1.5 flex min-h-4 items-center justify-center gap-1 text-center text-[0.625rem] font-semibold whitespace-nowrap transition-[opacity,transform] duration-150 max-sm:invisible",
                  emAndamento || ehPico ? "text-primary opacity-100" : "translate-y-1 text-on-surface opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
                )}>
                  {ehPico ? <Sparkles aria-hidden="true" size={10} strokeWidth={1.7} className="shrink-0" /> : null}
                  <span>{formatarMoedaCompacta(ponto.recebido)}</span>
                </span>

                <span aria-hidden="true" className="relative flex h-[112px] w-full items-end overflow-hidden rounded-t-[var(--radius-controle)] bg-selecao">
                  <span
                    className={cn(
                      "chart-grow absolute inset-x-0 bottom-0 rounded-t-[var(--radius-controle)]",
                      emAndamento ? hachura : "barra-grafico",
                    )}
                    style={{ height: `${altura}%`, animationDelay: `${indice * 80 + 80}ms` }}
                  />
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-2 border-t border-card-border pt-2">
          <ul className="flex gap-2 sm:gap-3" aria-hidden="true">
            {serie.map((ponto) => (
              <li key={ponto.data.toISOString()} className={cn("min-w-0 flex-1 truncate text-center text-xs", mesmoMes(ponto.data, agora) ? "font-semibold text-primary" : "text-outline")}>
                {capitalizar(formatarMesCurto(ponto.data).replace(".", ""))}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-outline">
        <span aria-hidden="true" className={cn("inline-block h-2.5 w-4 rounded-[var(--radius-tag)] border border-primary-fixed", hachura)} />
        Mês em andamento — ainda vai receber lançamentos
      </p>
    </figure>
  );
}
