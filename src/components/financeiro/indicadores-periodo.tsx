import {
  ArrowDownRight,
  BadgePercent,
  CalendarClock,
  HandCoins,
  ReceiptText,
  Scale,
  ShoppingBag,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Indicador } from "@/components/ui/indicador";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import type { IndicadoresDoPeriodo } from "@/server/consultas/painel-financeiro";
import { NumeroVivo } from "@/components/ui/numero-vivo";

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

  const naCabine = new Set(["Líquido recebido", "Resultado de caixa", "A receber"]);
  const naGrade = cartoes.filter((cartao) => !naCabine.has(cartao.rotulo));
  const proporcaoVencida = n.aReceber > 0 ? n.aReceberVencido / n.aReceber : 0;
  const proporcaoDasSaidas =
    n.despesasPagas !== null && n.liquidoRecebido > 0 ? Math.min(1, n.despesasPagas / n.liquidoRecebido) : null;

  return (
    <section aria-labelledby="indicadores-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="rotulo text-primary">Leitura financeira</p>
          <h2 id="indicadores-titulo" className="titulo-secao mt-1 text-on-surface">O que entrou, o que saiu e o que ainda está em aberto</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1 text-xs font-medium text-outline">
          <Sparkles aria-hidden="true" size={12} className="text-primary" />
          Atualizado pelo período selecionado
        </span>
      </div>

      <div className="cabine relative grid gap-6 overflow-hidden p-5 sm:p-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-0">
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full border border-white/10" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-8 -right-2 size-36 rounded-full border border-white/8" />

        <Indicador
          className="relative md:col-span-2 lg:col-span-1 lg:pr-6"
          rotulo={exemplo ? "Líquido recebido · demonstrativo" : "Líquido recebido"}
          tamanho="numero"
          valor={<NumeroVivo valor={n.liquidoRecebido} formato="moeda" />}
          frase={
            <>
              {formatarMoeda(n.totalRecebidoBruto)} recebidos; {formatarMoeda(n.taxasDeCartao)} ficaram em taxas de cartão
              {n.ajustes !== 0 ? `; inclui ${formatarMoeda(n.ajustes)} de ajustes` : ""}.
            </>
          }
        />
        <Indicador
          className="relative lg:border-l lg:border-cabine-linha lg:px-6"
          rotulo="Resultado de caixa"
          tamanho="numero-sm"
          valor={n.resultadoDeCaixa === null ? "—" : <NumeroVivo valor={n.resultadoDeCaixa} formato="moeda" />}
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
          className="relative lg:border-l lg:border-cabine-linha lg:pl-6"
          rotulo="A receber"
          tamanho="numero-sm"
          valor={<NumeroVivo valor={n.aReceber} formato="moeda" />}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {naGrade.map((cartao, indice) => {
          const Icone = cartao.icone;
          return (
            <article
              key={cartao.rotulo}
              style={{ animationDelay: `${Math.min(indice * 55, 220)}ms` }}
              className="dashboard-stagger premium-panel premium-interactive group flex min-w-0 flex-col rounded-[calc(var(--radius-painel)+1px)] border p-4 sm:p-5"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <h3 className="rotulo leading-4 text-on-surface-variant">{cartao.rotulo}</h3>
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border shadow-[0_10px_22px_-18px_rgba(7,57,112,.6)] transition-transform duration-200 group-hover:-translate-y-0.5",
                    cartao.tom === "positivo" && "border-positivo-borda bg-positivo-fundo text-positivo",
                    cartao.tom === "negativo" && "border-negativo-borda bg-negativo-fundo text-negativo",
                    !cartao.tom && "border-primary-fixed bg-selecao text-primary",
                  )}
                >
                  <Icone aria-hidden="true" size={18} strokeWidth={1.7} />
                </span>
              </div>

              <span
                className={cn(
                  "numero-sm mt-auto break-words tracking-[-0.035em]",
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
                <span className="mt-3 w-fit rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[0.625rem] font-medium tracking-[0.08em] text-outline uppercase">
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
