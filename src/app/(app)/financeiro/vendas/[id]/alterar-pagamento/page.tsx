import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlterarPagamento } from "@/components/financeiro/alterar-pagamento";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { formatarData, formatarMoeda } from "@/lib/format";
import { taxasParaVenda, vendaPorId } from "@/server/consultas/vendas";

export const metadata: Metadata = { title: "Alterar forma de pagamento" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaAlterarPagamento({ params }: Props) {
  const { id } = await params;

  if (!(await ehFinanceira())) {
    return <SomenteFinanceiro voltarPara={`/financeiro/vendas/${id}`} />;
  }

  const [venda, taxas] = await Promise.all([vendaPorId(id), taxasParaVenda()]);
  if (!venda) notFound();

  const confirmado =
    venda.recebimentos.find(
      (r) => r.situacao === "recebido" || r.situacao === "recebido_divergencia",
    )?.valorRecebido ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/financeiro/vendas/${venda.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a venda
      </Link>

      <Card>
        <CardCabecalho
          titulo="Alterar a forma de pagamento"
          descricao={`${venda.paciente} · ${venda.procedimento} · ${formatarData(venda.dataVenda)} · ${formatarMoeda(venda.valorFinal)}`}
        />
        <CardCorpo className="py-8">
          <AlterarPagamento
            venda={venda}
            taxas={taxas}
            recebimentoConfirmado={confirmado}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
