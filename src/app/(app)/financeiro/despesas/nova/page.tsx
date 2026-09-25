import { CalendarClock, ReceiptText, ShieldCheck, Tags } from "lucide-react";
import type { Metadata } from "next";
import { FormularioDespesa } from "@/components/financeiro/formulario-despesa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia, hoje } from "@/lib/dates";
import { criarDespesa } from "@/server/acoes/despesas";

export const metadata: Metadata = { title: "Nova despesa" };

function Nota({ icone: Icone, titulo, texto }: { icone: typeof ReceiptText; titulo: string; texto: string }) {
  return (
    <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
      <div className="flex items-center gap-2 text-primary">
        <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
        <p className="text-xs font-semibold">{titulo}</p>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-outline">{texto}</p>
    </div>
  );
}

export default async function PaginaNovaDespesa() {
  if (!(await ehFinanceira())) {
    return <SomenteFinanceiro voltarPara="/financeiro" />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
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
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioDespesa
                acao={criarDespesa}
                inicial={{ vencimento: chaveDoDia(hoje()) }}
                rotuloSalvar="Registrar despesa"
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Leitura correta do caixa</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Despesa é compromisso separado</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Nota icone={Tags} titulo="Categoria consistente" texto="Classifique a saída para que os filtros e a leitura mensal continuem comparáveis." />
                <Nota icone={CalendarClock} titulo="Vencimento real" texto="A data alimenta a fila do que está pendente ou vencido; registre o compromisso, não a data de digitação." />
                <Nota icone={ReceiptText} titulo="Taxa de cartão fica fora" texto="Taxa já reduz o líquido da venda. Lançá-la como despesa duplicaria o custo no financeiro." />
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
