import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioProcedimento } from "@/components/configuracoes/formulario-procedimento";
import { SomenteAdministradora } from "@/components/configuracoes/somente-administradora";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
import { criarProcedimento } from "@/server/acoes/procedimentos";

export const metadata: Metadata = { title: "Novo procedimento" };

export default async function PaginaNovoProcedimento() {
  if (!(await ehAdministradora())) {
    return <SomenteAdministradora voltarPara="/configuracoes/procedimentos" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/configuracoes/procedimentos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a tabela
      </Link>

      <Card>
        <CardCabecalho
          titulo="Novo procedimento"
          descricao="Duração e valor viram o padrão ao marcar na agenda; cada atendimento pode ajustar."
        />
        <CardCorpo className="py-8">
          <FormularioProcedimento
            acao={criarProcedimento}
            rotuloSalvar="Cadastrar procedimento"
            cancelarPara="/configuracoes/procedimentos"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
