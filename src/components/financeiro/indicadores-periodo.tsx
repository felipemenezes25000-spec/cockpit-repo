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

/** Razão à vista, no lugar do número — mesma postura do botão indisponível. */
const RESTRITO = "restrito ao financeiro";

type Cartao = {
  rotulo: string;
  /** `null` = o perfil não enxerga este número. Nunca vira zero. */
  valor: number | null;
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
 *
 * Os três números que dependem de despesa chegam como `null` para a recepção,
 * porque a RLS a impede de ver despesas. O cartão continua na tela, com traço
 * no lugar do valor e a razão à vista: esconder faria a pessoa procurar, e
 * imprimir zero seria mentir.
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
      // Despesa é sempre vermelha: dinheiro saindo, na convenção contábil.
      rotulo: "Despesas pagas",
      valor: n.despesasPagas,
      apoio: n.despesasPagas === null ? RESTRITO : "saídas do período",
      icone: ArrowDownRight,
      tom: n.despesasPagas === null ? undefined : "negativo",
    },
    {
      rotulo: "Despesas pendentes",
      valor: n.despesasPendentes,
      apoio: n.despesasPendentes === null ? RESTRITO : "a pagar até o fim do mês",
      icone: ReceiptText,
      tom: n.despesasPendentes === null ? undefined : "negativo",
    },
    {
      rotulo: "Resultado de caixa",
      valor: n.resultadoDeCaixa,
      apoio:
        n.resultadoDeCaixa === null ? RESTRITO : "líquido recebido − despesas pagas",
      icone: Scale,
      tom:
        n.resultadoDeCaixa === null
          ? undefined
          : n.resultadoDeCaixa >= 0
            ? "positivo"
            : "negativo",
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
                  className={cn(
                    "shrink-0",
                    cartao.tom === "negativo" ? "text-negativo" : "text-outline-variant",
                  )}
                />
              </div>

              <span
                className={cn(
                  "tabular text-lg font-semibold",
                  cartao.valor === null && "text-outline-variant",
                  cartao.tom === "positivo" && "text-positivo",
                  cartao.tom === "negativo" && "text-negativo",
                  cartao.valor !== null && !cartao.tom && "text-on-surface",
                  cartao.tom === "atencao" && "text-on-surface",
                )}
                title={cartao.valor === null ? RESTRITO : undefined}
              >
                {cartao.valor === null ? "—" : formatarMoeda(cartao.valor)}
              </span>

              <span
                className={cn(
                  "mt-1 text-xs",
                  cartao.tom === "atencao" ? "font-medium text-atencao" : "text-outline",
                )}
              >
                {cartao.apoio}
              </span>

              {exemplo && cartao.valor !== null ? (
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
