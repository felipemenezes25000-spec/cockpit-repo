import { CalendarRange, Plus, ReceiptText, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { IndicadoresPeriodo } from "@/components/financeiro/indicadores-periodo";
import { ListaMovimentacoes } from "@/components/financeiro/lista-movimentacoes";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { BotaoLink } from "@/components/ui/button";
import { CardCorpo } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { formatarMesAno } from "@/lib/format";
import { lerMes } from "@/lib/periodo";
import { indicadoresDoPeriodo, movimentacoes } from "@/server/consultas/painel-financeiro";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";

export const metadata: Metadata = {
  title: "Financeiro",
  description: "Vendas, recebimentos, despesas e o resultado de caixa da clínica.",
};

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);

  const [numeros, extrato, exemplo, podeFinanceiro] = await Promise.all([
    indicadoresDoPeriodo(periodo),
    movimentacoes(periodo),
    temDadosDeExemplo(),
    ehFinanceira(),
  ]);

  return (
    <div className="page-reveal flex flex-col gap-5 sm:gap-6">
      <CabecalhoDePagina
        icone={Wallet}
        rotulo="Caixa e recebimentos"
        titulo="Visão financeira"
        descricao="Acompanhe o que foi vendido, o que entrou de fato, o que ainda está em aberto e as saídas do período sem misturar conceitos contábeis."
        acoes={
          <>
            <BotaoLink href="/financeiro/vendas/nova" variante="primaria" tamanho="sm">
              <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
              Nova venda
            </BotaoLink>
            {podeFinanceiro ? (
              <BotaoLink href="/financeiro/despesas/nova" variante="contorno" tamanho="sm">
                <ReceiptText aria-hidden="true" size={16} strokeWidth={1.75} />
                Nova despesa
              </BotaoLink>
            ) : null}
          </>
        }
        meta={
          <>
            <SeloHero tom="informativo">{formatarMesAno(periodo.de)}</SeloHero>
            {exemplo ? <SeloHero tom="atencao">Contém valores demonstrativos</SeloHero> : null}
            {!podeFinanceiro ? <SeloHero>Visão limitada ao seu perfil</SeloHero> : null}
          </>
        }
      />

      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <section aria-label="Período financeiro" className="premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border px-4 py-4 sm:px-5">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary-container" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
              <CalendarRange size={18} strokeWidth={1.8} />
            </span>
            <div>
              <p className="rotulo text-primary">Período financeiro</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">{formatarMesAno(periodo.de)}</p>
              <p className="mt-0.5 text-xs leading-5 text-outline">Os indicadores, movimentações e resultados abaixo acompanham este recorte.</p>
            </div>
          </div>
          <NavegacaoMes periodo={periodo} />
        </div>
      </section>

      <IndicadoresPeriodo numeros={numeros} exemplo={exemplo} />

      <CardRecolhivel
        id="fin-ultimas-movimentacoes"
        titulo="Últimas movimentações"
        descricao="Uma leitura rápida das entradas e saídas mais recentes; o extrato completo continua na aba Movimentações."
      >
        <CardCorpo className="pt-4!">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="rotulo text-primary">Extrato recente</p>
            <span className="rounded-full border border-card-border bg-surface-container-low px-2.5 py-1 text-xs font-medium text-outline">
              Até 8 movimentações
            </span>
          </div>
          <ListaMovimentacoes itens={extrato.slice(0, 8)} />
        </CardCorpo>
      </CardRecolhivel>
    </div>
  );
}
