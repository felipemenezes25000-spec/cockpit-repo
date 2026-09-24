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
import { Indicador } from "@/components/ui/indicador";
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

  // A cabine leva o que se lê de relance; a grade, o detalhe.
  const naCabine = new Set(["Líquido recebido", "Resultado de caixa", "A receber"]);
  const naGrade = cartoes.filter((cartao) => !naCabine.has(cartao.rotulo));
  const proporcaoVencida = n.aReceber > 0 ? n.aReceberVencido / n.aReceber : 0;
  const proporcaoDasSaidas =
    n.despesasPagas !== null && n.liquidoRecebido > 0 ? Math.min(1, n.despesasPagas / n.liquidoRecebido) : null;

  return (
    <section aria-labelledby="indicadores-titulo" className="flex flex-col gap-4">
      <h2 id="indicadores-titulo" className="sr-only">Indicadores do período</h2>

      <div className="cabine grid gap-6 p-5 sm:p-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-0">
        <Indicador
          className="md:col-span-2 lg:col-span-1 lg:pr-6"
          rotulo={exemplo ? "Líquido recebido · demonstrativo" : "Líquido recebido"}
          tamanho="numero"
          valor={formatarMoeda(n.liquidoRecebido)}
          frase={
            <>
              {formatarMoeda(n.totalRecebidoBruto)} recebidos; {formatarMoeda(n.taxasDeCartao)} ficaram em taxas de cartão
              {n.ajustes !== 0 ? `; inclui ${formatarMoeda(n.ajustes)} de ajustes` : ""}.
            </>
          }
        />
        <Indicador
          className="lg:border-l lg:border-cabine-linha lg:px-6"
          rotulo="Resultado de caixa"
          tamanho="numero-sm"
          valor={n.resultadoDeCaixa === null ? "—" : formatarMoeda(n.resultadoDeCaixa)}
          proporcao={proporcaoDasSaidas ?? undefined}
          descricaoDaBarra={
            proporcaoDasSaidas === null
              ? undefined
              : `${Math.round(proporcaoDasSaidas * 100)}% do líquido recebido saiu em despesas pagas`
          }
          frase={
            n.resultadoDeCaixa === null
              ? RESTRITO
              : proporcaoDasSaidas === null
                ? "líquido recebido − despesas pagas"
                : `${Math.round(proporcaoDasSaidas * 100)}% do líquido saiu em despesas pagas`
          }
        />
        <Indicador
          className="lg:border-l lg:border-cabine-linha lg:pl-6"
          rotulo="A receber"
          tamanho="numero-sm"
          valor={formatarMoeda(n.aReceber)}
          proporcao={n.aReceber > 0 ? proporcaoVencida : undefined}
          descricaoDaBarra={`${Math.round(proporcaoVencida * 100)}% do que falta receber já venceu`}
          frase={
            n.aReceberVencido > 0 ? (
              <strong className="font-semibold">{formatarMoeda(n.aReceberVencido)} já vencido</strong>
            ) : (
              "nada vencido"
            )
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {naGrade.map((cartao) => {
          const Icone = cartao.icone;
          return (
            <article
              key={cartao.rotulo}
              className="premium-panel flex min-w-0 flex-col rounded-[var(--radius-painel)] border p-4 sm:p-5"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <h3 className="rotulo leading-4">{cartao.rotulo}</h3>
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border",
                    cartao.tom === "positivo" && "border-positivo-borda bg-positivo-fundo text-positivo",
                    cartao.tom === "negativo" && "border-negativo-borda bg-negativo-fundo text-negativo",
                    !cartao.tom && "border-card-border bg-surface text-primary",
                  )}
                >
                  <Icone aria-hidden="true" size={17} strokeWidth={1.65} />
                </span>
              </div>

              <span
                className={cn(
                  "numero-sm mt-auto break-words",
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
