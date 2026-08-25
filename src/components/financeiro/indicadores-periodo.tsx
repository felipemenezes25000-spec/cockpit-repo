import {
  ArrowDownRight,
  BadgePercent,
  CalendarClock,
  HandCoins,
  ReceiptText,
  Scale,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import type { IndicadoresDoPeriodo } from "@/server/consultas/painel-financeiro";

type Cartao = {
  rotulo: string;
  valor: number;
  apoio: string;
  icone: LucideIcon;
  /** Sem semântica forçada: só o resultado e o vencido ganham cor. */
  tom?: "positivo" | "negativo" | "atencao";
};

/**
 * Os oito números do período.
 *
 * A taxa de cartão aparece uma vez só: como dedução entre o bruto e o
 * líquido. Ela não existe nas despesas — somar lá de novo dobraria o custo.
 */
export function IndicadoresPeriodo({
  numeros,
  exemplo,
}: {
  numeros: IndicadoresDoPeriodo;
  exemplo: boolean;
}) {
  const n = numeros;

  const cartoes: Cartao[] = [
    {
      rotulo: "Total vendido",
      valor: n.totalVendido,
      apoio: "vendas do período",
      icone: ShoppingBag,
    },
    {
      rotulo: "Total recebido",
      valor: n.totalRecebidoBruto,
      apoio: "bruto, antes das taxas",
      icone: Wallet,
    },
    {
      rotulo: "Taxas de cartão",
      valor: n.taxasDeCartao,
      apoio: "descontadas da clínica",
      icone: BadgePercent,
    },
    {
      rotulo: "Líquido recebido",
      valor: n.liquidoRecebido,
      apoio:
        n.ajustes !== 0
          ? `inclui ${formatarMoeda(n.ajustes)} de ajustes`
          : "o que de fato entrou",
      icone: HandCoins,
      tom: "positivo",
    },
    {
      rotulo: "A receber",
      valor: n.aReceber,
      apoio:
        n.aReceberVencido > 0
          ? `${formatarMoeda(n.aReceberVencido)} já venceu`
          : "em aberto hoje",
      icone: CalendarClock,
      tom: n.aReceberVencido > 0 ? "atencao" : undefined,
    },
    {
      rotulo: "Despesas pagas",
      valor: n.despesasPagas,
      apoio: "saídas do período",
      icone: ArrowDownRight,
    },
    {
      rotulo: "Despesas pendentes",
      valor: n.despesasPendentes,
      apoio: "a pagar até o fim do mês",
      icone: ReceiptText,
      tom: n.despesasPendentes > 0 ? "atencao" : undefined,
    },
    {
      rotulo: "Resultado de caixa",
      valor: n.resultadoDeCaixa,
      apoio: "líquido recebido − despesas pagas",
      icone: Scale,
      tom: n.resultadoDeCaixa >= 0 ? "positivo" : "negativo",
    },
  ];

  return (
    <section aria-label="Indicadores do período">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cartoes.map((cartao) => {
          const Icone = cartao.icone;
          return (
            <div
              key={cartao.rotulo}
              className="flex flex-col rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="rotulo">{cartao.rotulo}</h3>
                <Icone
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.5}
                  className="shrink-0 text-outline-variant"
                />
              </div>

              <span
                className={cn(
                  "tabular text-lg font-semibold",
                  cartao.tom === "positivo" && "text-positivo",
                  cartao.tom === "negativo" && "text-negativo",
                  !cartao.tom && "text-on-surface",
                  cartao.tom === "atencao" && "text-on-surface",
                )}
              >
                {formatarMoeda(cartao.valor)}
              </span>

              <span
                className={cn(
                  "mt-1 text-xs",
                  cartao.tom === "atencao" ? "font-medium text-atencao" : "text-outline",
                )}
              >
                {cartao.apoio}
              </span>

              {exemplo ? (
                <span className="mt-1 text-[0.625rem] text-outline-variant uppercase">
                  Demonstrativo
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
