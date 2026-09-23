import { BadgePercent, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlterarTaxa } from "@/components/financeiro/alterar-taxa";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { formatarData, formatarMoeda } from "@/lib/format";
import { bpDoBanco, formatarPercentual } from "@/lib/moeda";
import { formaUsaCartao, recebimentoConfirmado } from "@/lib/venda";
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

  const taxaPadrao = venda.taxaCartaoId ? await taxaPorId(venda.taxaCartaoId) : null;
  const vivo = venda.recebimentos.find((r) => r.situacao !== "cancelado") ?? null;
  const confirmado = vivo && recebimentoConfirmado(vivo.situacao) ? vivo.valorRecebido : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href={`/financeiro/vendas/${venda.id}`}>Voltar para a venda</LinkDeVoltar>

      <CabecalhoDePagina
        icone={PencilLine}
        rotulo="Ajuste financeiro"
        titulo="Alterar a taxa desta venda"
        descricao={`${venda.paciente} · ${venda.procedimento} · ${formatarData(venda.dataVenda)}. Esta mudança afeta somente a operação atual e exige justificativa registrada.`}
        meta={
          <>
            <SeloHero tom="informativo">
              <BadgePercent aria-hidden="true" size={13} strokeWidth={1.75} />
              Atual {formatarPercentual(bpDoBanco(venda.taxaPercentual))}
            </SeloHero>
            <SeloHero>Líquido atual {formatarMoeda(venda.valorLiquido)}</SeloHero>
            {taxaPadrao ? <SeloHero>Padrão da tabela {formatarPercentual(bpDoBanco(taxaPadrao.percentual))}</SeloHero> : <SeloHero tom="atencao">Sem padrão cadastrado</SeloHero>}
            {confirmado !== null ? <SeloHero tom="atencao">Recebimento já confirmado</SeloHero> : <SeloHero tom="positivo">Recebimento ainda ajustável</SeloHero>}
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Definir taxa excepcional"
          descricao="A tabela padrão não é alterada. A prévia mostra custo e líquido da venda antes da confirmação; recebimentos já confirmados permanecem intactos e podem gerar ajuste."
        />
        <CardCorpo className="py-7 sm:py-8">
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
