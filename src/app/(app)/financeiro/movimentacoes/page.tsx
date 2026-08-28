import type { Metadata } from "next";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FiltrosFinanceiro } from "@/components/financeiro/filtros";
import { ListaMovimentacoes } from "@/components/financeiro/lista-movimentacoes";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { lerMes } from "@/lib/periodo";
import {
  movimentacoes,
  type TipoMovimentacao,
} from "@/server/consultas/painel-financeiro";

/** Rótulo da URL → tipo interno. */
const TIPOS: Record<string, TipoMovimentacao> = {
  vendas: "venda",
  entradas: "recebimento",
  saidas: "despesa",
  ajustes: "ajuste",
};

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

  const tipoBruto = Array.isArray(parametros.tipo) ? parametros.tipo[0] : parametros.tipo;
  const tipo = tipoBruto && TIPOS[tipoBruto] ? TIPOS[tipoBruto] : null;

  const [todos, podeFinanceiro] = await Promise.all([
    movimentacoes(periodo),
    ehFinanceira(),
  ]);

  const itens = tipo ? todos.filter((i) => i.tipo === tipo) : todos;

  return (
    <div className="flex flex-col gap-6">
      <FaixaDemonstracao />
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <Card>
        <CardCabecalho
          titulo="Histórico das movimentações"
          descricao="Vendas, entradas, saídas e ajustes, na ordem em que aconteceram."
        />
        <CardCorpo className="flex flex-col gap-5">
          <NavegacaoMes periodo={periodo} />
          <FiltrosFinanceiro
            grupos={[
              {
                param: "tipo",
                rotulo: "Tipo",
                opcoes: [
                  { valor: "", rotulo: "Tudo" },
                  { valor: "vendas", rotulo: "Vendas" },
                  { valor: "entradas", rotulo: "Entradas" },
                  { valor: "saidas", rotulo: "Saídas" },
                  { valor: "ajustes", rotulo: "Ajustes" },
                ],
              },
            ]}
          />
          <ListaMovimentacoes itens={itens} />
        </CardCorpo>
      </Card>
    </div>
  );
}
