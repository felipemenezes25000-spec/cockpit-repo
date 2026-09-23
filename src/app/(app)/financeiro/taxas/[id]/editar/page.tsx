import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EXPLICACAO_TAXAS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { FormularioTaxa } from "@/components/financeiro/formulario-taxa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
import { atualizarTaxa } from "@/server/acoes/taxas-cartao";
import { taxaPorId } from "@/server/consultas/taxas";

export const metadata: Metadata = { title: "Editar taxa" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarTaxa({ params }: Props) {
  if (!(await ehAdministradora())) {
    return <SomenteAdministradora
        voltarPara="/financeiro/taxas"
        explicacao={EXPLICACAO_TAXAS}
      />;
  }

  const { id } = await params;
  const taxa = await taxaPorId(id);
  if (!taxa) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/financeiro/taxas"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a tabela
      </Link>

      <Card>
        <CardCabecalho
          titulo={`${taxa.operadora} — ${taxa.tipo === "credito" ? `crédito ${taxa.parcelas}x` : "débito"}`}
          descricao="Mudar aqui vale só para as próximas vendas: as antigas guardam a taxa do momento."
        />
        <CardCorpo className="py-8">
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
