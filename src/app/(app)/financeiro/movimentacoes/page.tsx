import { History } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FiltrosFinanceiro } from "@/components/financeiro/filtros";
import { ListaMovimentacoes } from "@/components/financeiro/lista-movimentacoes";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { lerMes } from "@/lib/periodo";
import { movimentacoes, type TipoMovimentacao } from "@/server/consultas/painel-financeiro";

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

export default async function PaginaMovimentacoes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);
  const tipoBruto = Array.isArray(parametros.tipo) ? parametros.tipo[0] : parametros.tipo;
  const tipo = tipoBruto && TIPOS[tipoBruto] ? TIPOS[tipoBruto] : null;

  const [todos, podeFinanceiro] = await Promise.all([movimentacoes(periodo), ehFinanceira()]);
  const itens = tipo ? todos.filter((i) => i.tipo === tipo) : todos;
  const filtrada = itens.length !== todos.length;

  return (
    <div className="flex flex-col gap-6">
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <CabecalhoDePagina
        icone={History}
        rotulo="Financeiro"
        titulo="Movimentações"
        descricao={podeFinanceiro ? "Linha do tempo financeira com vendas, entradas, saídas e ajustes na ordem em que aconteceram." : "Linha do tempo com vendas, entradas e ajustes. Saídas permanecem restritas ao financeiro."}
        meta={
          <>
            <SeloHero tom="informativo">{itens.length}{filtrada ? ` de ${todos.length}` : ""} {itens.length === 1 ? "movimentação" : "movimentações"}</SeloHero>
            {filtrada ? <SeloHero tom="atencao">Filtro de tipo ativo</SeloHero> : <SeloHero>Histórico completo do mês</SeloHero>}
            {!podeFinanceiro ? <SeloHero>Saídas ocultas por permissão</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Histórico do período" descricao="Troque o mês ou isole um tipo de movimentação para acompanhar a trilha financeira." />
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
                  ...(podeFinanceiro ? [{ valor: "saidas", rotulo: "Saídas" }] : []),
                  { valor: "ajustes", rotulo: "Ajustes" },
                ],
              },
            ]}
          />
          <ListaMovimentacoes itens={itens} filtrada={filtrada} />
        </CardCorpo>
      </Card>
    </div>
  );
}
