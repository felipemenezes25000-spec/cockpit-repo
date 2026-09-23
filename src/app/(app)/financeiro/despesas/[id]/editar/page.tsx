import { PencilLine, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioDespesa } from "@/components/financeiro/formulario-despesa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia } from "@/lib/dates";
import { ROTULO_SITUACAO_DESPESA } from "@/lib/despesa";
import { atualizarDespesa } from "@/server/acoes/despesas";
import { despesaPorId } from "@/server/consultas/despesas";

export const metadata: Metadata = { title: "Editar despesa" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarDespesa({ params }: Props) {
  if (!(await ehFinanceira())) return <SomenteFinanceiro voltarPara="/financeiro" />;

  const { id } = await params;
  const despesa = await despesaPorId(id);
  if (!despesa) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/financeiro/despesas">Voltar para despesas</LinkDeVoltar>

      <CabecalhoDePagina
        icone={PencilLine}
        rotulo="Despesa"
        titulo={despesa.descricao}
        descricao="Atualize os dados deste compromisso financeiro mantendo a situação atual visível durante a edição."
        meta={
          <>
            <SeloHero tom="negativo">
              <ReceiptText aria-hidden="true" size={13} strokeWidth={1.75} />
              Saída financeira
            </SeloHero>
            <SeloHero tom={despesa.situacao === "paga" ? "positivo" : "atencao"}>{ROTULO_SITUACAO_DESPESA[despesa.situacao]}</SeloHero>
            <SeloHero>Vencimento {chaveDoDia(despesa.vencimento)}</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Editar despesa" descricao="Revise descrição, categoria, valor, vencimento e observações antes de salvar." />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioDespesa
            acao={atualizarDespesa}
            despesaId={despesa.id}
            inicial={{
              descricao: despesa.descricao,
              categoria: despesa.categoria,
              valor: despesa.valor.toFixed(2).replace(".", ","),
              vencimento: chaveDoDia(despesa.vencimento),
              observacoes: despesa.observacoes ?? "",
            }}
            rotuloSalvar="Salvar alterações"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
