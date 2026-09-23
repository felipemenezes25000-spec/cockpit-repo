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

const RESTRITO = "restrito ao financeiro";

type Cartao = {
  rotulo: string;
  valor: number | null;
  apoio: string;
  icone: LucideIcon;
  tom?: "positivo" | "negativo";
  apoioNegativo?: boolean;
};

export function IndicadoresPeriodo({
  numeros,
  exemplo,
}: {
  numeros: IndicadoresDoPeriodo;
  exemplo: boolean;
}) {
  const n = numeros;

  const cartoes: Cartao[] = [
    { rotulo: "Total vendido", valor: n.totalVendido, apoio: "vendas do período", icone: ShoppingBag },
    { rotulo: "Total recebido", valor: n.totalRecebidoBruto, apoio: "bruto, antes das taxas", icone: Wallet },
    { rotulo: "Taxas de cartão", valor: n.taxasDeCartao, apoio: "descontadas da clínica", icone: BadgePercent },
    {
      rotulo: "Líquido recebido",
      valor: n.liquidoRecebido,
      apoio: n.ajustes !== 0 ? `inclui ${formatarMoeda(n.ajustes)} de ajustes` : "o que de fato entrou",
      icone: HandCoins,
      tom: "positivo",
    },
    {
      rotulo: "A receber",
      valor: n.aReceber,
      apoio: n.aReceberVencido > 0 ? `${formatarMoeda(n.aReceberVencido)} já vencido` : "em aberto hoje",
      icone: CalendarClock,
      apoioNegativo: n.aReceberVencido > 0,
    },
    {
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
      apoio: n.resultadoDeCaixa === null ? RESTRITO : "líquido recebido − despesas pagas",
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
    <section aria-labelledby="indicadores-titulo">
      <h2 id="indicadores-titulo" className="sr-only">Indicadores do período</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {cartoes.map((cartao) => {
          const Icone = cartao.icone;
          const destaque = cartao.rotulo === "Líquido recebido" || cartao.rotulo === "Resultado de caixa";

          return (
            <article
              key={cartao.rotulo}
              className={cn(
                "premium-panel premium-interactive relative isolate flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:p-5",
                destaque && "bg-linear-to-br from-white to-primary-fixed/22",
              )}
            >
              <span aria-hidden="true" className="pointer-events-none absolute -top-8 -right-8 -z-10 size-28 rounded-full bg-primary-fixed/35 blur-2xl" />

              <div className="mb-5 flex items-start justify-between gap-3">
                <h3 className="rotulo leading-4">{cartao.rotulo}</h3>
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl border bg-surface/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                    cartao.tom === "positivo" && "border-positivo-borda/70 bg-positivo-fundo/65 text-positivo",
                    cartao.tom === "negativo" && "border-negativo-borda/70 bg-negativo-fundo/65 text-negativo",
                    !cartao.tom && "border-card-border/80 text-primary",
                  )}
                >
                  <Icone aria-hidden="true" size={17} strokeWidth={1.65} />
                </span>
              </div>

              <span
                className={cn(
                  "tabular mt-auto text-[clamp(1.12rem,2vw,1.45rem)] leading-tight font-semibold tracking-[-0.025em]",
                  cartao.valor === null && "text-outline",
                  cartao.tom === "positivo" && "text-positivo",
                  cartao.tom === "negativo" && "text-negativo",
                  cartao.valor !== null && !cartao.tom && "text-on-surface",
                )}
                title={cartao.valor === null ? RESTRITO : undefined}
              >
                {cartao.valor === null ? "—" : formatarMoeda(cartao.valor)}
              </span>

              <span
                className={cn(
                  "mt-2 text-xs leading-5",
                  cartao.apoioNegativo ? "font-medium text-negativo" : "text-outline",
                )}
              >
                {cartao.apoio}
              </span>

              {exemplo && cartao.valor !== null ? (
                <span className="mt-2 text-[0.625rem] font-medium tracking-[0.08em] text-outline uppercase">
                  Demonstrativo
                </span>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
