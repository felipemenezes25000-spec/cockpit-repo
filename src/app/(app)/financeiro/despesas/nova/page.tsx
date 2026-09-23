import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioDespesa } from "@/components/financeiro/formulario-despesa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia, hoje } from "@/lib/dates";
import { criarDespesa } from "@/server/acoes/despesas";

export const metadata: Metadata = { title: "Nova despesa" };

export default async function PaginaNovaDespesa() {
  if (!(await ehFinanceira())) {
    return <SomenteFinanceiro voltarPara="/financeiro" />;
  }

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
        <CardCabecalho titulo="Nova despesa" />
        <CardCorpo className="py-8">
          <FormularioDespesa
            acao={criarDespesa}
            inicial={{ vencimento: chaveDoDia(hoje()) }}
            rotuloSalvar="Registrar despesa"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
