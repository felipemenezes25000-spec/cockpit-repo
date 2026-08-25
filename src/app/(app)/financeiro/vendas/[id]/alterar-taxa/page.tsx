import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlterarTaxa } from "@/components/financeiro/alterar-taxa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { formatarData, formatarMoeda } from "@/lib/format";
import { formaUsaCartao } from "@/lib/venda";
import { taxaPorId } from "@/server/consultas/taxas";
import { vendaPorId } from "@/server/consultas/vendas";

export const metadata: Metadata = { title: "Alterar taxa" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaAlterarTaxa({ params }: Props) {
  const { id } = await params;

  if (!(await ehFinanceira())) {
    return <SomenteFinanceiro voltarPara={`/financeiro/vendas/${id}`} />;
  }

  const venda = await vendaPorId(id);
  if (!venda || !formaUsaCartao(venda.forma)) notFound();

  // O percentual atual da tabela para esta linha — só para comparação.
  const taxaPadrao = venda.taxaCartaoId ? await taxaPorId(venda.taxaCartaoId) : null;

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
          titulo="Alterar a taxa desta venda"
          descricao={`${venda.paciente} · ${venda.procedimento} · ${formatarData(venda.dataVenda)} · ${formatarMoeda(venda.valorFinal)}`}
        />
        <CardCorpo className="py-8">
          <AlterarTaxa
            venda={venda}
            taxaPadraoPercentual={taxaPadrao?.percentual ?? null}
            recebimentoConfirmado={confirmado}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
