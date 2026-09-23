import { Repeat, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlterarPagamento } from "@/components/financeiro/alterar-pagamento";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { formatarData, formatarMoeda } from "@/lib/format";
import { recebimentoConfirmado, ROTULO_FORMA } from "@/lib/venda";
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

  const vivo = venda.recebimentos.find((r) => r.situacao !== "cancelado") ?? null;
  const confirmado = vivo && recebimentoConfirmado(vivo.situacao) ? vivo.valorRecebido : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href={`/financeiro/vendas/${venda.id}`}>Voltar para a venda</LinkDeVoltar>

      <CabecalhoDePagina
        icone={Repeat}
        rotulo="Ajuste financeiro"
        titulo="Alterar forma de pagamento"
        descricao={`${venda.paciente} · ${venda.procedimento} · ${formatarData(venda.dataVenda)}. Compare o cenário atual com o novo antes de confirmar qualquer mudança.`}
        meta={
          <>
            <SeloHero tom="informativo">Atual: {ROTULO_FORMA[venda.forma]}{venda.parcelas > 1 ? ` · ${venda.parcelas}x` : ""}</SeloHero>
            <SeloHero>
              <Wallet aria-hidden="true" size={13} strokeWidth={1.75} />
              Venda {formatarMoeda(venda.valorFinal)}
            </SeloHero>
            {confirmado !== null ? <SeloHero tom="atencao">Recebimento já confirmado</SeloHero> : vivo === null ? <SeloHero tom="negativo">Sem recebimento ativo</SeloHero> : <SeloHero tom="positivo">Recebimento ainda ajustável</SeloHero>}
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Simular e confirmar a mudança"
          descricao="O comparativo mostra taxa e líquido antes de gravar. Se o recebimento já foi confirmado, o registro original permanece intacto e o sistema calcula o efeito como ajuste."
        />
        <CardCorpo className="py-7 sm:py-8">
          <AlterarPagamento
            venda={venda}
            taxas={taxas}
            recebimentoConfirmado={confirmado}
            semRecebimentoVivo={vivo === null}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
