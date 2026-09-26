import { ArrowDownRight, ArrowUpRight, History, Receipt, Scale } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FiltrosFinanceiro } from "@/components/financeiro/filtros";
import { ListaMovimentacoes } from "@/components/financeiro/lista-movimentacoes";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { formatarMoeda } from "@/lib/format";
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

function Metrica({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
}: {
  icone: typeof History;
  rotulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="financeiro-metrica-cabine">
      <span className="flex items-center justify-between gap-3 text-cabine-texto-secundario">
        <span className="rotulo text-[0.62rem] text-current">{rotulo}</span>
        <Icone aria-hidden="true" size={16} strokeWidth={1.75} />
      </span>
      <strong className="tabular mt-3 block text-xl font-semibold tracking-[-0.03em] text-cabine-texto sm:text-2xl">{valor}</strong>
      <span className="mt-1 block text-[0.7rem] leading-4 text-cabine-texto-secundario">{detalhe}</span>
    </div>
  );
}

export default async function PaginaMovimentacoes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);
  const tipoBruto = Array.isArray(parametros.tipo) ? parametros.tipo[0] : parametros.tipo;
  const tipo = tipoBruto && TIPOS[tipoBruto] ? TIPOS[tipoBruto] : null;

  const [todos, podeFinanceiro] = await Promise.all([movimentacoes(periodo), ehFinanceira()]);
  const itens = tipo ? todos.filter((i) => i.tipo === tipo) : todos;
  const filtrada = itens.length !== todos.length;

  const vendas = todos.filter((item) => item.tipo === "venda");
  const entradas = todos.filter((item) => item.tipo === "recebimento");
  const saidas = todos.filter((item) => item.tipo === "despesa");
  const ajustes = todos.filter((item) => item.tipo === "ajuste");
  const soma = (lista: typeof todos) => lista.reduce((total, item) => total + item.valor, 0);
  const caixa = soma(entradas) + soma(saidas) + soma(ajustes);

  return (
    <div className="flex flex-col gap-6">
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

      {/* Abaixo do cabeçalho, como nas outras telas do Financeiro. */}
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <section className="cabine financeiro-cabine p-4 sm:p-5" aria-label="Pulso financeiro do período">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rotulo text-cabine-texto-secundario">Pulso do período</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-cabine-texto sm:text-2xl">O que efetivamente se moveu</h2>
            </div>
            <p className="max-w-md text-xs leading-5 text-cabine-texto-secundario">
              Venda mostra volume comercial. Entradas, saídas e ajustes formam o efeito no caixa.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            <Metrica icone={Receipt} rotulo="Vendas" valor={String(vendas.length)} detalhe="operações comerciais" />
            <Metrica icone={ArrowUpRight} rotulo="Entradas" valor={formatarMoeda(soma(entradas))} detalhe={`${entradas.length} lançamentos`} />
            {podeFinanceiro ? <Metrica icone={ArrowDownRight} rotulo="Saídas" valor={formatarMoeda(Math.abs(soma(saidas)))} detalhe={`${saidas.length} lançamentos`} /> : null}
            <Metrica icone={Scale} rotulo="Ajustes" valor={formatarMoeda(soma(ajustes))} detalhe={`${ajustes.length} ocorrências`} />
            <div className="col-span-2 lg:col-span-1">
              <Metrica icone={History} rotulo="Efeito no caixa" valor={formatarMoeda(caixa)} detalhe="entradas + saídas + ajustes" />
            </div>
          </div>
        </div>
      </section>

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
