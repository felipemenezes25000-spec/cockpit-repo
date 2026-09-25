import { BadgePercent, History, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import {
  EXPLICACAO_TAXAS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { FormularioTaxa } from "@/components/financeiro/formulario-taxa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import { criarTaxa } from "@/server/acoes/taxas-cartao";

export const metadata: Metadata = { title: "Nova taxa de cartão" };

export default async function PaginaNovaTaxa() {
  if (!(await ehAdministradora())) {
    return <SomenteAdministradora voltarPara="/financeiro/taxas" explicacao={EXPLICACAO_TAXAS} />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <LinkDeVoltar href="/financeiro/taxas">Voltar para taxas</LinkDeVoltar>

      <CabecalhoDePagina
        icone={BadgePercent}
        rotulo="Financeiro"
        titulo="Nova taxa de cartão"
        descricao="Cadastre o padrão de custo para uma combinação de operadora, tipo e parcelamento. A taxa será copiada apenas pelas próximas vendas compatíveis."
        meta={
          <>
            <SeloHero tom="informativo">Padrão para vendas futuras</SeloHero>
            <SeloHero>Histórico preservado nas vendas antigas</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Configuração da taxa" descricao="Uma linha por operadora, tipo e quantidade de parcelas." />
        <CardCorpo className="py-7 sm:py-8">
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioTaxa acao={criarTaxa} rotuloSalvar="Cadastrar taxa" />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Tabela padrão</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Uma regra por combinação</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Operadora + tipo + parcelas</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Essa combinação identifica qual taxa será sugerida em uma nova venda.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <History aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Sem efeito retroativo</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-outline">Venda registrada guarda sua própria cópia. Mudar a tabela depois não altera o histórico.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 py-3">
                  <p className="text-xs font-semibold text-primary">Taxa é dedução do líquido</p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">Ela não vira uma despesa separada e não deve ser contabilizada duas vezes.</p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
