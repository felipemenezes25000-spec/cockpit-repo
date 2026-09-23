import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioDespesa } from "@/components/financeiro/formulario-despesa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia } from "@/lib/dates";
import { ROTULO_SITUACAO_DESPESA } from "@/lib/despesa";
import { atualizarDespesa } from "@/server/acoes/despesas";
import { despesaPorId } from "@/server/consultas/despesas";

export const metadata: Metadata = { title: "Editar despesa" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarDespesa({ params }: Props) {
  if (!(await ehFinanceira())) {
    return <SomenteFinanceiro voltarPara="/financeiro" />;
  }

  const { id } = await params;
  const despesa = await despesaPorId(id);
  if (!despesa) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/financeiro/despesas"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para as despesas
      </Link>

      <Card>
        <CardCabecalho
          titulo="Editar despesa"
          descricao={`Situação: ${ROTULO_SITUACAO_DESPESA[despesa.situacao]}.`}
        />
        <CardCorpo className="py-8">
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
        </CardCorpo>
      </Card>
    </div>
  );
}
