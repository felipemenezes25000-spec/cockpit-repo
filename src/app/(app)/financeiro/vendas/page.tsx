import { Plus, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FiltrosFinanceiro, type GrupoDeFiltro } from "@/components/financeiro/filtros";
import { ListaVendas } from "@/components/financeiro/lista-vendas";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { formatarMoeda } from "@/lib/format";
import { normalizarRotulo } from "@/lib/importacao";
import { centavosParaReais, somaEmCentavos } from "@/lib/moeda";
import { lerMes } from "@/lib/periodo";
import { FORMAS_EM_ORDEM, ROTULO_FORMA, type FormaPagamento } from "@/lib/venda";
import { listarVendas, type VendaDaLista } from "@/server/consultas/vendas";

export const metadata: Metadata = {
  title: "Vendas",
  description: "Vendas e recebimentos da clínica.",
};

const SITUACOES = ["abertas", "recebidas", "canceladas"] as const;
type FiltroSituacao = (typeof SITUACOES)[number] | "";

function lerTexto(valor: string | string[] | undefined): string {
  return ((Array.isArray(valor) ? valor[0] : valor) ?? "").slice(0, 80);
}

function filtrar(vendas: VendaDaLista[], situacao: FiltroSituacao, forma: string, busca: string): VendaDaLista[] {
  const termo = normalizarRotulo(busca);
  return vendas.filter((v) => {
    if (situacao === "abertas") {
      if (v.situacaoRecebimento !== "previsto" && v.situacaoRecebimento !== "pendente") return false;
    } else if (situacao === "recebidas") {
      if (v.situacaoRecebimento !== "recebido" && v.situacaoRecebimento !== "recebido_divergencia") return false;
    } else if (situacao === "canceladas") {
      if (v.situacaoRecebimento !== null) return false;
    }
    if (forma && v.forma !== forma) return false;
    if (termo) {
      const alvo = normalizarRotulo(`${v.paciente} ${v.procedimento}`);
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
}

export default async function PaginaVendas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);
  const situacaoBruta = lerTexto(parametros.situacao);
  const situacao: FiltroSituacao = (SITUACOES as readonly string[]).includes(situacaoBruta) ? (situacaoBruta as FiltroSituacao) : "";
  const formaBruta = lerTexto(parametros.forma);
  const forma = (FORMAS_EM_ORDEM as readonly string[]).includes(formaBruta) ? formaBruta : "";
  const busca = lerTexto(parametros.busca);

  const [todas, podeFinanceiro] = await Promise.all([listarVendas(periodo), ehFinanceira()]);
  const vendas = filtrar(todas, situacao, forma, busca);
  const total = centavosParaReais(somaEmCentavos(vendas.map((v) => v.valorFinal)));
  const filtrada = vendas.length !== todas.length;

  const grupos: GrupoDeFiltro[] = [
    {
      param: "situacao",
      rotulo: "Situação",
      opcoes: [
        { valor: "", rotulo: "Todas" },
        { valor: "abertas", rotulo: "A receber" },
        { valor: "recebidas", rotulo: "Recebidas" },
        { valor: "canceladas", rotulo: "Canceladas" },
      ],
    },
    {
      param: "forma",
      rotulo: "Forma",
      opcoes: [
        { valor: "", rotulo: "Todas as formas" },
        ...FORMAS_EM_ORDEM.map((f: FormaPagamento) => ({ valor: f, rotulo: ROTULO_FORMA[f] })),
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <CabecalhoDePagina
        icone={ShoppingBag}
        rotulo="Financeiro"
        titulo="Vendas"
        descricao="Operações comerciais do período com recebimento, forma de pagamento e líquido preservados por venda."
        acoes={
          <BotaoLink href="/financeiro/vendas/nova" variante="primaria" tamanho="sm">
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            Nova venda
          </BotaoLink>
        }
        meta={
          <>
            <SeloHero tom={vendas.length > 0 ? "informativo" : "neutro"}>{vendas.length}{filtrada ? ` de ${todas.length}` : ""} {vendas.length === 1 ? "venda" : "vendas"}</SeloHero>
            <SeloHero tom="positivo">Volume {formatarMoeda(total)}</SeloHero>
            {filtrada ? <SeloHero tom="atencao">Filtros ativos</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Operações do período"
          descricao={vendas.length === 0 ? (filtrada ? "Nenhuma venda com estes filtros." : "Nenhuma venda no mês.") : "Filtre por situação, forma ou paciente para chegar rapidamente à operação certa."}
        />
        <CardCorpo className="flex flex-col gap-5">
          <NavegacaoMes periodo={periodo} />
          <FiltrosFinanceiro grupos={grupos} busca={{ param: "busca", placeholder: "Buscar por paciente ou procedimento" }} />
          <ListaVendas vendas={vendas} filtrada={filtrada} />
        </CardCorpo>
      </Card>
    </div>
  );
}
