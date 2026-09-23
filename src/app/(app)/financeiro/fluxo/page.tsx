import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FluxoMensal } from "@/components/financeiro/fluxo-mensal";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { fluxoMensal } from "@/server/consultas/painel-financeiro";

export const metadata: Metadata = {
  title: "Fluxo de caixa",
  description: "Entradas líquidas, saídas pagas e resultado dos últimos 12 meses.",
};

export default async function PaginaFluxo() {
  const podeFinanceiro = await ehFinanceira();
  if (!podeFinanceiro) return <SomenteFinanceiro voltarPara="/financeiro" />;

  const meses = await fluxoMensal();

  return (
    <div className="flex flex-col gap-6">
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <CabecalhoDePagina
        icone={Scale}
        rotulo="Financeiro"
        titulo="Fluxo de caixa"
        descricao="Doze meses de entradas líquidas, saídas pagas e resultado acumulado, sem misturar taxa de cartão com despesa nem chamar resultado de lucro."
        meta={
          <>
            <SeloHero tom="informativo">{meses.length} {meses.length === 1 ? "mês carregado" : "meses carregados"}</SeloHero>
            <SeloHero>Entradas já líquidas das taxas</SeloHero>
            <SeloHero tom="atencao">Lucro ainda não definido pela clínica</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Fluxo mensal" descricao="O que entrou líquido, o que saiu pago e como o caixa se acumulou ao longo do período." />
        <CardCorpo><FluxoMensal meses={meses} /></CardCorpo>
        <CardRodape className="text-outline">
          Entradas são o valor efetivamente recebido, já líquido das taxas de cartão, mais os ajustes. Saídas são as despesas pagas no mês. Lucro não aparece: a regra de cálculo ainda não foi definida pela clínica.
        </CardRodape>
      </Card>
    </div>
  );
}
