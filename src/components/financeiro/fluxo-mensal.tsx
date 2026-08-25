import { cn } from "@/lib/cn";
import { capitalizar, formatarMesAno, formatarMoedaCompacta } from "@/lib/format";
import type { MesDoFluxo } from "@/server/consultas/painel-financeiro";

/**
 * Fluxo de caixa dos últimos 12 meses, em tabela: entradas líquidas,
 * saídas pagas, resultado e o acumulado do período.
 */
export function FluxoMensal({ meses }: { meses: MesDoFluxo[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-card-border text-left">
            <th scope="col" className="rotulo py-3 pr-4">Mês</th>
            <th scope="col" className="rotulo py-3 pr-4 text-right">Recebido líquido</th>
            <th scope="col" className="rotulo py-3 pr-4 text-right">Despesas pagas</th>
            <th scope="col" className="rotulo py-3 pr-4 text-right">Resultado</th>
            <th scope="col" className="rotulo py-3 text-right">Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((mes, i) => {
            const ultimo = i === meses.length - 1;
            return (
              <tr
                key={mes.mes.getTime()}
                className={cn(
                  "border-b border-card-border last:border-b-0",
                  ultimo && "bg-surface-container-low font-medium",
                )}
              >
                <td className="py-2.5 pr-4 text-on-surface">
                  {capitalizar(formatarMesAno(mes.mes))}
                  {ultimo ? <span className="ml-2 text-xs text-outline">(em curso)</span> : null}
                </td>
                <td className="tabular py-2.5 pr-4 text-right text-positivo">
                  {formatarMoedaCompacta(mes.recebido)}
                </td>
                {/* Entrada verde, saída vermelha — convenção contábil. */}
                <td className="tabular py-2.5 pr-4 text-right text-negativo">
                  {formatarMoedaCompacta(mes.despesas)}
                </td>
                <td
                  className={cn(
                    "tabular py-2.5 pr-4 text-right",
                    mes.resultado > 0 && "text-positivo",
                    mes.resultado < 0 && "text-negativo",
                    mes.resultado === 0 && "text-on-surface-variant",
                  )}
                >
                  {formatarMoedaCompacta(mes.resultado)}
                </td>
                <td
                  className={cn(
                    "tabular py-2.5 text-right",
                    mes.acumulado >= 0 ? "text-on-surface" : "text-negativo",
                  )}
                >
                  {formatarMoedaCompacta(mes.acumulado)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
