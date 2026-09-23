import { BadgePercent } from "lucide-react";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
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
          <FormularioTaxa acao={criarTaxa} rotuloSalvar="Cadastrar taxa" />
        </CardCorpo>
      </Card>
    </div>
  );
}
