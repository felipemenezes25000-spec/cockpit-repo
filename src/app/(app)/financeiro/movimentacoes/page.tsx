import type { Metadata } from "next";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { ListaMovimentacoes } from "@/components/financeiro/lista-movimentacoes";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { lerMes } from "@/lib/periodo";
import { movimentacoes } from "@/server/consultas/painel-financeiro";

export const metadata: Metadata = {
  title: "Movimentações",
  description: "O histórico do que aconteceu no financeiro, mês a mês.",
};

export default async function PaginaMovimentacoes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);

  const [itens, podeFinanceiro] = await Promise.all([
    movimentacoes(periodo),
    ehFinanceira(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <FaixaDemonstracao />
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <Card>
        <CardCabecalho
          titulo="Histórico das movimentações"
          descricao="Vendas, entradas, saídas e ajustes, na ordem em que aconteceram."
        />
        <CardCorpo className="flex flex-col gap-6">
          <NavegacaoMes periodo={periodo} />
          <ListaMovimentacoes itens={itens} />
        </CardCorpo>
      </Card>
    </div>
  );
}
