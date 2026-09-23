import { ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { FormularioDespesa } from "@/components/financeiro/formulario-despesa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia, hoje } from "@/lib/dates";
import { criarDespesa } from "@/server/acoes/despesas";

export const metadata: Metadata = { title: "Nova despesa" };

export default async function PaginaNovaDespesa() {
  if (!(await ehFinanceira())) {
    return <SomenteFinanceiro voltarPara="/financeiro" />;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/financeiro/despesas">Voltar para despesas</LinkDeVoltar>

      <CabecalhoDePagina
        icone={ReceiptText}
        rotulo="Financeiro"
        titulo="Registrar despesa"
        descricao="Registre a saída com vencimento e situação claramente separados, preservando a leitura do caixa e das pendências do período."
        meta={
          <>
            <SeloHero tom="negativo">Saída financeira</SeloHero>
            <SeloHero>Visível apenas ao financeiro</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Dados da despesa"
          descricao="Informe o compromisso financeiro e revise o vencimento antes de registrar."
        />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioDespesa
            acao={criarDespesa}
            inicial={{ vencimento: chaveDoDia(hoje()) }}
            rotuloSalvar="Registrar despesa"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
