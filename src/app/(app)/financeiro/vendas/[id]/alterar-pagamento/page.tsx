import { BadgeCheck, Receipt, Repeat, Wallet } from "lucide-react";
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

function Passo({ numero, titulo, texto }: { numero: string; titulo: string; texto: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary-fixed-dim bg-primary-fixed text-[0.68rem] font-bold text-primary">{numero}</span>
      <span>
        <strong className="block text-sm font-semibold text-on-surface">{titulo}</strong>
        <span className="mt-0.5 block text-xs leading-5 text-outline">{texto}</span>
      </span>
    </li>
  );
}

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
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
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
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <AlterarPagamento
                venda={venda}
                taxas={taxas}
                recebimentoConfirmado={confirmado}
                semRecebimentoVivo={vivo === null}
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <BadgeCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Antes de confirmar</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">A mudança é auditável</h2>
                </div>
              </div>

              <ol className="mt-5 flex flex-col gap-4">
                <Passo numero="1" titulo="Escolha a nova forma" texto="Cartão usa a tabela de taxas vigente para calcular custo e líquido." />
                <Passo numero="2" titulo="Compare o impacto" texto="A tela mostra forma, taxa e líquido atual contra o cenário novo." />
                <Passo numero="3" titulo="Justifique" texto="O motivo fica registrado no histórico com autor, data e hora." />
              </ol>

              <div className="mt-5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                <div className="flex items-center gap-2 text-primary">
                  <Receipt aria-hidden="true" size={15} strokeWidth={1.75} />
                  <span className="text-xs font-semibold">Recebimento</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  {confirmado !== null
                    ? "Já confirmado: o original não é reescrito. Se o novo líquido mudar, entra um ajuste financeiro separado."
                    : vivo === null
                      ? "O recebimento desta venda está cancelado; a alteração afeta apenas a venda."
                      : "Ainda aberto: o recebimento previsto acompanha o novo cenário."}
                </p>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
