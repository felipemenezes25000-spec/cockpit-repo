import { Plus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { IndicadoresPeriodo } from "@/components/financeiro/indicadores-periodo";
import { ListaMovimentacoes } from "@/components/financeiro/lista-movimentacoes";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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
    <div className="flex flex-col gap-6">
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <NavegacaoMes periodo={periodo} />

        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <IndicadoresPeriodo numeros={numeros} exemplo={exemplo} />

      <Card>
        <CardCabecalho
          titulo="Últimas movimentações"
          descricao="O extrato completo fica na aba Movimentações."
        />
        <CardCorpo>
          <ListaMovimentacoes itens={extrato.slice(0, 8)} />
        </CardCorpo>
      </Card>
    </div>
  );
}
