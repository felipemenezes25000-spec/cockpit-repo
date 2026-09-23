import { Plus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FiltrosFinanceiro, type GrupoDeFiltro } from "@/components/financeiro/filtros";
import { ListaDespesas } from "@/components/financeiro/lista-despesas";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia, hoje } from "@/lib/dates";
import { CATEGORIAS_EM_ORDEM, despesaVencida, ROTULO_CATEGORIA } from "@/lib/despesa";
import { formatarMoeda } from "@/lib/format";
import { centavosParaReais, somaEmCentavos } from "@/lib/moeda";
import { lerMes } from "@/lib/periodo";
import { listarDespesas, type Despesa } from "@/server/consultas/despesas";

export const metadata: Metadata = { title: "Despesas", description: "Contas a pagar e pagas da clínica." };

const SITUACOES = ["pendentes", "vencidas", "pagas", "canceladas"] as const;
type FiltroSituacao = (typeof SITUACOES)[number] | "";

function lerTexto(valor: string | string[] | undefined): string {
  return ((Array.isArray(valor) ? valor[0] : valor) ?? "").slice(0, 40);
}

function filtrar(despesas: Despesa[], situacao: FiltroSituacao, categoria: string) {
  return despesas.filter((d) => {
    const vencida = despesaVencida(d.situacao, d.venceEmDias);
    if (situacao === "pendentes" && (d.situacao !== "pendente" || vencida)) return false;
    if (situacao === "vencidas" && !vencida) return false;
    if (situacao === "pagas" && d.situacao !== "paga") return false;
    if (situacao === "canceladas" && d.situacao !== "cancelada") return false;
    if (categoria && d.categoria !== categoria) return false;
    return true;
  });
}

export default async function PaginaDespesas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await ehFinanceira())) return <SomenteFinanceiro voltarPara="/financeiro" />;

  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);
  const situacaoBruta = lerTexto(parametros.situacao);
  const situacao: FiltroSituacao = (SITUACOES as readonly string[]).includes(situacaoBruta) ? (situacaoBruta as FiltroSituacao) : "";
  const categoriaBruta = lerTexto(parametros.categoria);
  const categoria = (CATEGORIAS_EM_ORDEM as readonly string[]).includes(categoriaBruta) ? categoriaBruta : "";

  const todas = await listarDespesas(periodo);
  const despesas = filtrar(todas, situacao, categoria);
  const filtrada = despesas.length !== todas.length;
  const pendentes = despesas.filter((d) => d.situacao === "pendente");
  const vencidas = despesas.filter((d) => despesaVencida(d.situacao, d.venceEmDias));
  const totalPendente = centavosParaReais(somaEmCentavos(pendentes.map((d) => d.valor)));

  const grupos: GrupoDeFiltro[] = [
    {
      param: "situacao",
      rotulo: "Situação",
      opcoes: [
        { valor: "", rotulo: "Todas" },
        { valor: "pendentes", rotulo: "Pendentes" },
        { valor: "vencidas", rotulo: "Vencidas" },
        { valor: "pagas", rotulo: "Pagas" },
        { valor: "canceladas", rotulo: "Canceladas" },
      ],
    },
    {
      param: "categoria",
      rotulo: "Categoria",
      opcoes: [{ valor: "", rotulo: "Todas as categorias" }, ...CATEGORIAS_EM_ORDEM.map((c) => ({ valor: c, rotulo: ROTULO_CATEGORIA[c] }))],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AbasFinanceiro podeFinanceiro />

      <CabecalhoDePagina
        icone={ReceiptText}
        rotulo="Financeiro"
        titulo="Despesas"
        descricao="Contas pagas, pendentes e vencidas do período, separadas das taxas de cartão para não duplicar custos no caixa."
        acoes={
          <BotaoLink href="/financeiro/despesas/nova" variante="primaria" tamanho="sm">
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            Nova despesa
          </BotaoLink>
        }
        meta={
          <>
            <SeloHero>{despesas.length}{filtrada ? ` de ${todas.length}` : ""} {despesas.length === 1 ? "despesa" : "despesas"}</SeloHero>
            {pendentes.length > 0 ? <SeloHero tom="atencao">A pagar {formatarMoeda(totalPendente)}</SeloHero> : <SeloHero tom="positivo">Nada pendente nos filtros</SeloHero>}
            {vencidas.length > 0 ? <SeloHero tom="negativo">{vencidas.length} {vencidas.length === 1 ? "vencida" : "vencidas"}</SeloHero> : null}
            {filtrada ? <SeloHero tom="informativo">Filtros ativos</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Contas do período" descricao={despesas.length === 0 ? (filtrada ? "Nada com estes filtros." : "Nada neste mês.") : "Use situação e categoria para organizar o que exige atenção agora."} />
        <CardCorpo className="flex flex-col gap-5">
          <NavegacaoMes periodo={periodo} />
          <FiltrosFinanceiro grupos={grupos} />
          <ListaDespesas despesas={despesas} dataPadrao={chaveDoDia(hoje())} filtrada={filtrada} />
        </CardCorpo>
        <CardRodape className="text-outline">
          A taxa de cartão não entra aqui: ela já é descontada no líquido dos recebimentos. Lançá-la de novo contaria o custo duas vezes.
        </CardRodape>
      </Card>
    </div>
  );
}
