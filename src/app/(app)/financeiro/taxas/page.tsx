import { BadgePercent, Plus } from "lucide-react";
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

export default async function PaginaTaxas() {
  if (!(await ehFinanceira())) return <SomenteFinanceiro voltarPara="/financeiro" />;

  const [taxas, administradora] = await Promise.all([listarTaxas(), ehAdministradora()]);
  const ativas = taxas.filter((t) => t.ativa).length;
  const inativas = taxas.length - ativas;

  return (
    <div className="flex flex-col gap-6">
      <AbasFinanceiro podeFinanceiro />

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
