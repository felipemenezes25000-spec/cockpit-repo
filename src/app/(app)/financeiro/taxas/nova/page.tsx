import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  EXPLICACAO_TAXAS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { FormularioTaxa } from "@/components/financeiro/formulario-taxa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
import { criarTaxa } from "@/server/acoes/taxas-cartao";

export const metadata: Metadata = { title: "Nova taxa de cartão" };

export default async function PaginaNovaTaxa() {
  if (!(await ehAdministradora())) {
    return <SomenteAdministradora
        voltarPara="/financeiro/taxas"
        explicacao={EXPLICACAO_TAXAS}
      />;
  }

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
          titulo="Nova taxa de cartão"
          descricao="Uma linha por operadora, tipo e parcelamento."
        />
        <CardCorpo className="py-8">
          <FormularioTaxa acao={criarTaxa} rotuloSalvar="Cadastrar taxa" />
        </CardCorpo>
      </Card>
    </div>
  );
}
