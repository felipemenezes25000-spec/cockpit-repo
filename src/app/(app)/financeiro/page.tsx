import { Plus, ReceiptText, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { IndicadoresPeriodo } from "@/components/financeiro/indicadores-periodo";
import { ListaMovimentacoes } from "@/components/financeiro/lista-movimentacoes";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
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
            <SeloHero tom="informativo">Período selecionado</SeloHero>
            {exemplo ? <SeloHero tom="atencao">Contém valores demonstrativos</SeloHero> : null}
            {!podeFinanceiro ? <SeloHero>Visão limitada ao seu perfil</SeloHero> : null}
          </>
        }
      />

      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <div className="premium-panel flex flex-col gap-3 rounded-[var(--radius-painel)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="rotulo text-primary/75">Período</span>
        <NavegacaoMes periodo={periodo} />
      </div>

      <IndicadoresPeriodo numeros={numeros} exemplo={exemplo} />

      <Card>
        <CardCabecalho
          titulo="Últimas movimentações"
          descricao="Uma leitura rápida das entradas e saídas mais recentes; o extrato completo continua na aba Movimentações."
        />
        <CardCorpo>
          <ListaMovimentacoes itens={extrato.slice(0, 8)} />
        </CardCorpo>
      </Card>
    </div>
  );
}
