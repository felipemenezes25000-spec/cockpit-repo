import { BadgePercent, CreditCard, Plus, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { ListaTaxas } from "@/components/financeiro/lista-taxas";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora, ehFinanceira } from "@/lib/auth";
import { listarTaxas } from "@/server/consultas/taxas";

export const metadata: Metadata = {
  title: "Taxas de cartão",
  description: "Tabela padrão de taxas por operadora, tipo e parcelas.",
};

function MetricaTaxa({ icone: Icone, rotulo, valor, apoio }: { icone: typeof BadgePercent; rotulo: string; valor: string; apoio: string }) {
  return (
    <div className="financeiro-metrica-cabine">
      <div className="flex items-center justify-between gap-3">
        <span className="rotulo text-cabine-texto-secundario">{rotulo}</span>
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-cabine-linha bg-white/10 text-cabine-texto">
          <Icone aria-hidden="true" size={17} strokeWidth={1.75} />
        </span>
      </div>
      <p className="numero mt-4 text-cabine-texto">{valor}</p>
      <p className="mt-1 text-xs leading-5 text-cabine-texto-secundario">{apoio}</p>
    </div>
  );
}

export default async function PaginaTaxas() {
  if (!(await ehFinanceira())) return <SomenteFinanceiro voltarPara="/financeiro" />;

  const [taxas, administradora] = await Promise.all([listarTaxas(), ehAdministradora()]);
  const ativas = taxas.filter((t) => t.ativa).length;
  const inativas = taxas.length - ativas;
  const operadoras = new Set(taxas.map((t) => t.operadora)).size;

  return (
    <div className="page-reveal flex flex-col gap-6">
      <CabecalhoDePagina
        icone={BadgePercent}
        rotulo="Financeiro"
        titulo="Taxas de cartão"
        descricao="Tabela padrão por operadora, tipo e parcelamento. Cada venda guarda a taxa usada no momento para preservar o histórico financeiro."
        acoes={
          administradora && taxas.length > 0 ? (
            <BotaoLink href="/financeiro/taxas/nova" variante="primaria" tamanho="sm">
              <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
              Nova taxa
            </BotaoLink>
          ) : undefined
        }
        meta={
          <>
            <SeloHero tom={ativas > 0 ? "positivo" : "atencao"}>{ativas} {ativas === 1 ? "taxa ativa" : "taxas ativas"}</SeloHero>
            {inativas > 0 ? <SeloHero>{inativas} inativas</SeloHero> : null}
            <SeloHero tom="informativo">Mudanças valem para vendas futuras</SeloHero>
          </>
        }
      />

      <AbasFinanceiro podeFinanceiro />

      <section aria-label="Resumo da tabela de taxas" className="cabine financeiro-cabine grid gap-1 p-3 sm:grid-cols-3 sm:p-4">
        <MetricaTaxa icone={BadgePercent} rotulo="Taxas ativas" valor={String(ativas)} apoio="opções disponíveis para novas vendas com cartão" />
        <MetricaTaxa icone={CreditCard} rotulo="Operadoras" valor={String(operadoras)} apoio="maquininhas ou adquirentes presentes na tabela" />
        <MetricaTaxa icone={ShieldCheck} rotulo="Histórico" valor="Preservado" apoio="cada venda continua com a taxa que foi usada na origem" />
      </section>

      <Card>
        <CardCabecalho titulo="Tabela de taxas" descricao="A taxa já inclui o custo previsto para o parcelamento configurado." />
        <CardCorpo><ListaTaxas taxas={taxas} podeEditar={administradora} /></CardCorpo>
        <CardRodape className="text-outline">
          {administradora
            ? "Cada venda copia a taxa do momento: mudar a tabela vale só para as próximas. A taxa já inclui a antecipação do parcelado."
            : "Só a administradora configura a tabela. O financeiro pode alterar a taxa de uma venda específica, com justificativa."}
        </CardRodape>
      </Card>
    </div>
  );
}
