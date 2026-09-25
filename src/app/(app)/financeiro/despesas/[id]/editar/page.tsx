import { CalendarClock, PencilLine, ReceiptText, Tag } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioDespesa } from "@/components/financeiro/formulario-despesa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia } from "@/lib/dates";
import { ROTULO_CATEGORIA, ROTULO_SITUACAO_DESPESA } from "@/lib/despesa";
import { formatarMoeda } from "@/lib/format";
import { atualizarDespesa } from "@/server/acoes/despesas";
import { despesaPorId } from "@/server/consultas/despesas";

export const metadata: Metadata = { title: "Editar despesa" };

type Props = { params: Promise<{ id: string }> };

function Resumo({ icone: Icone, rotulo, valor }: { icone: typeof ReceiptText; rotulo: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
        <Icone aria-hidden="true" size={15} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="rotulo text-[0.62rem] text-outline">{rotulo}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-on-surface">{valor}</p>
      </div>
    </div>
  );
}

export default async function PaginaEditarDespesa({ params }: Props) {
  if (!(await ehFinanceira())) return <SomenteFinanceiro voltarPara="/financeiro" />;

  const { id } = await params;
  const despesa = await despesaPorId(id);
  if (!despesa) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
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
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
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
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <p className="rotulo text-primary">Antes da edição</p>
              <h2 className="mt-1.5 text-base font-semibold text-on-surface">Resumo do compromisso</h2>
              <p className="mt-1 text-xs leading-5 text-outline">Use este quadro para conferir o registro original enquanto altera os campos.</p>

              <div className="mt-5 flex flex-col gap-2.5">
                <Resumo icone={ReceiptText} rotulo="Valor" valor={formatarMoeda(despesa.valor)} />
                <Resumo icone={Tag} rotulo="Categoria" valor={ROTULO_CATEGORIA[despesa.categoria]} />
                <Resumo icone={CalendarClock} rotulo="Vencimento" valor={chaveDoDia(despesa.vencimento)} />
              </div>

              <div className="mt-4 rounded-[var(--radius-controle)] border border-atencao-borda bg-atencao-fundo px-3.5 py-3">
                <p className="text-xs font-semibold text-atencao">Situação atual: {ROTULO_SITUACAO_DESPESA[despesa.situacao]}</p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">Editar cadastro não deve esconder a situação operacional do compromisso.</p>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
