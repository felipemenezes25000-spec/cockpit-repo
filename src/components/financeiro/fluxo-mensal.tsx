import { cn } from "@/lib/cn";
import { capitalizar, formatarMesAno, formatarMoedaCompacta } from "@/lib/format";
import type { MesDoFluxo } from "@/server/consultas/painel-financeiro";

export function FluxoMensal({ meses }: { meses: MesDoFluxo[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 sm:hidden">
        {meses.map((mes, i) => {
          const ultimo = i === meses.length - 1;
          return (
            <li
              key={mes.mes.getTime()}
              className={cn(
                "rounded-[var(--radius-cartao)] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]",
                ultimo
                  ? "border-primary-fixed-dim/65 bg-primary-fixed/22"
                  : "border-card-border/70 bg-surface/60",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-on-surface">{capitalizar(formatarMesAno(mes.mes))}</p>
                {ultimo ? <span className="rounded-full bg-primary-fixed/60 px-2.5 py-1 text-[0.68rem] font-semibold text-primary">Em curso</span> : null}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
                <Valor rotulo="Recebido líquido" classe={corDaEntrada(mes.recebido)} valor={mes.recebido} />
                <Valor rotulo="Despesas pagas" classe={corDaSaida(mes.despesas)} valor={mes.despesas} />
                <Valor rotulo="Resultado" classe={corDoResultado(mes.resultado)} valor={mes.resultado} />
                <Valor rotulo="Acumulado" classe={corDoAcumulado(mes.acumulado)} valor={mes.acumulado} />
              </dl>
            </li>
          );
        })}
      </ul>

      <div
        className="rolagem-discreta hidden overflow-x-auto rounded-[var(--radius-cartao)] border border-card-border/70 bg-surface/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] sm:block"
        role="region"
        aria-label="Fluxo mensal, tabela"
        tabIndex={0}
      >
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-surface-container-low/65">
            <tr className="border-b border-card-border/75 text-left">
              <th scope="col" className="rotulo px-4 py-3.5">Mês</th>
              <th scope="col" className="rotulo px-4 py-3.5 text-right">Recebido líquido</th>
              <th scope="col" className="rotulo px-4 py-3.5 text-right">Despesas pagas</th>
              <th scope="col" className="rotulo px-4 py-3.5 text-right">Resultado</th>
              <th scope="col" className="rotulo px-4 py-3.5 text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((mes, i) => {
              const ultimo = i === meses.length - 1;
              return (
                <tr
                  key={mes.mes.getTime()}
                  className={cn(
                    "border-b border-card-border/65 transition-colors last:border-b-0 hover:bg-surface-container-low/45",
                    ultimo && "bg-primary-fixed/18 font-medium hover:bg-primary-fixed/28",
                  )}
                >
                  <th scope="row" className={cn("px-4 py-3.5 text-left text-on-surface", ultimo ? "font-semibold" : "font-medium")}>
                    {capitalizar(formatarMesAno(mes.mes))}
                    {ultimo ? <span className="ml-2 rounded-full bg-primary-fixed/60 px-2 py-0.5 text-[0.66rem] font-semibold text-primary">em curso</span> : null}
                  </th>
                  <td className={cn("tabular px-4 py-3.5 text-right font-medium", corDaEntrada(mes.recebido))}>{formatarMoedaCompacta(mes.recebido)}</td>
                  <td className={cn("tabular px-4 py-3.5 text-right font-medium", corDaSaida(mes.despesas))}>{formatarMoedaCompacta(mes.despesas)}</td>
                  <td className={cn("tabular px-4 py-3.5 text-right font-semibold", corDoResultado(mes.resultado))}>{formatarMoedaCompacta(mes.resultado)}</td>
                  <td className={cn("tabular px-4 py-3.5 text-right font-semibold", corDoAcumulado(mes.acumulado))}>{formatarMoedaCompacta(mes.acumulado)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Valor({ rotulo, valor, classe }: { rotulo: string; valor: number; classe: string }) {
  return (
    <div className="rounded-[var(--radius-controle)] border border-card-border/55 bg-surface/55 px-3 py-2.5">
      <dt className="text-[0.68rem] font-medium text-outline">{rotulo}</dt>
      <dd className={cn("tabular mt-1 font-semibold", classe)}>{formatarMoedaCompacta(valor)}</dd>
    </div>
  );
}

const ZERADO = "text-on-surface-variant";
function corDaEntrada(valor: number): string { return valor === 0 ? ZERADO : "text-positivo"; }
function corDaSaida(valor: number): string { return valor === 0 ? ZERADO : "text-negativo"; }
function corDoResultado(valor: number): string { if (valor > 0) return "text-positivo"; if (valor < 0) return "text-negativo"; return ZERADO; }
function corDoAcumulado(valor: number): string { return valor >= 0 ? "text-on-surface" : "text-negativo"; }
