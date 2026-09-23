import { BadgePercent, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  EXPLICACAO_TAXAS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { FormularioTaxa } from "@/components/financeiro/formulario-taxa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import { atualizarTaxa } from "@/server/acoes/taxas-cartao";
import { taxaPorId } from "@/server/consultas/taxas";

export const metadata: Metadata = { title: "Editar taxa" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarTaxa({ params }: Props) {
  if (!(await ehAdministradora())) {
    return <SomenteAdministradora voltarPara="/financeiro/taxas" explicacao={EXPLICACAO_TAXAS} />;
  }

  const { id } = await params;
  const taxa = await taxaPorId(id);
  if (!taxa) notFound();

  const descricaoTaxa = `${taxa.operadora} — ${taxa.tipo === "credito" ? `crédito ${taxa.parcelas}x` : "débito"}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/financeiro/taxas">Voltar para taxas</LinkDeVoltar>

      <CabecalhoDePagina
        icone={PencilLine}
        rotulo="Taxa de cartão"
        titulo={descricaoTaxa}
        descricao="Ajuste o padrão usado por novas vendas. Vendas já registradas mantêm a cópia da taxa que estava vigente no momento da operação."
        meta={
          <>
            <SeloHero tom={taxa.ativa ? "positivo" : "neutro"}>{taxa.ativa ? "Taxa ativa" : "Taxa inativa"}</SeloHero>
            <SeloHero tom="informativo">
              <BadgePercent aria-hidden="true" size={13} strokeWidth={1.7} />
              Histórico preservado
            </SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Editar configuração" descricao="A alteração passa a valer apenas para operações futuras que usem esta combinação." />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioTaxa
            acao={atualizarTaxa}
            taxaId={taxa.id}
            inicial={{
              operadora: taxa.operadora,
              tipo: taxa.tipo,
              parcelas: String(taxa.parcelas),
              percentual: String(taxa.percentual).replace(".", ","),
            }}
            rotuloSalvar="Salvar alterações"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
