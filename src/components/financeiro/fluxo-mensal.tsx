import { cn } from "@/lib/cn";
import { capitalizar, formatarMesAno, formatarMoedaCompacta } from "@/lib/format";
import type { MesDoFluxo } from "@/server/consultas/painel-financeiro";

/**
 * Fluxo de caixa dos últimos 12 meses: entradas líquidas, saídas pagas,
 * resultado e o acumulado do período.
 *
 * Duas formas do mesmo dado. No celular, uma lista (um mês por item, os
 * quatro valores com rótulo): a tabela de cinco colunas não cabe em 320 px, e
 * rolando de lado só mostrava a coluna "Mês". A partir de `sm`, a tabela. Se
 * ela ainda precisar rolar (entre 640 e ~700 px), o contêiner recebe foco pelo
 * teclado e tem nome — região rolável que só o mouse alcança não é acessível
 * (WCAG 2.1.1).
 *
 * Cor: entrada verde, saída vermelha — convenção contábil. Mês zerado fica em
 * cinza: "R$ 0" verde ou vermelho sugeriria um movimento que não houve.
 */
export function FluxoMensal({ meses }: { meses: MesDoFluxo[] }) {
  return (
    <>
      <ul className="divide-y divide-card-border sm:hidden">
        {meses.map((mes, i) => {
          const ultimo = i === meses.length - 1;
          return (
            <li
              key={mes.mes.getTime()}
              className={cn("-mx-3 px-3 py-3", ultimo && "rounded-[var(--radius-cartao)] bg-surface-container-low")}
            >
              <p className="text-sm font-medium text-on-surface">
                {capitalizar(formatarMesAno(mes.mes))}
                {ultimo ? <span className="ml-2 text-xs font-normal text-outline">(em curso)</span> : null}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
        className="hidden overflow-x-auto sm:block"
        role="region"
        aria-label="Fluxo mensal, tabela"
        tabIndex={0}
      >
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
                  <th
                    scope="row"
                    className={cn("py-2.5 pr-4 text-left text-on-surface", ultimo ? "font-medium" : "font-normal")}
                  >
                    {capitalizar(formatarMesAno(mes.mes))}
                    {ultimo ? <span className="ml-2 text-xs text-outline">(em curso)</span> : null}
                  </th>
                  <td className={cn("tabular py-2.5 pr-4 text-right", corDaEntrada(mes.recebido))}>
                    {formatarMoedaCompacta(mes.recebido)}
                  </td>
                  <td className={cn("tabular py-2.5 pr-4 text-right", corDaSaida(mes.despesas))}>
                    {formatarMoedaCompacta(mes.despesas)}
                  </td>
                  <td className={cn("tabular py-2.5 pr-4 text-right", corDoResultado(mes.resultado))}>
                    {formatarMoedaCompacta(mes.resultado)}
                  </td>
                  <td className={cn("tabular py-2.5 text-right", corDoAcumulado(mes.acumulado))}>
                    {formatarMoedaCompacta(mes.acumulado)}
                  </td>
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
    <div className="min-w-0">
      <dt className="text-xs text-outline">{rotulo}</dt>
      <dd className={cn("tabular", classe)}>{formatarMoedaCompacta(valor)}</dd>
    </div>
  );
}

const ZERADO = "text-on-surface-variant";

function corDaEntrada(valor: number): string {
  return valor === 0 ? ZERADO : "text-positivo";
}

function corDaSaida(valor: number): string {
  return valor === 0 ? ZERADO : "text-negativo";
}

function corDoResultado(valor: number): string {
  if (valor > 0) return "text-positivo";
  if (valor < 0) return "text-negativo";
  return ZERADO;
}

function corDoAcumulado(valor: number): string {
  return valor >= 0 ? "text-on-surface" : "text-negativo";
}
