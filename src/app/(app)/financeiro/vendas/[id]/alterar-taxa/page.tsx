import { BadgePercent, History, PencilLine, ShieldCheck } from "lucide-react";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
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
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <AlterarTaxa
                venda={venda}
                taxaPadraoPercentual={taxaPadrao?.percentual ?? null}
                recebimentoConfirmado={confirmado}
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Exceção controlada</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">A tabela continua intacta</h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Taxa desta venda</p>
                  <p className="mt-1 text-xs leading-5 text-outline">A nova porcentagem vale somente para esta operação e não muda vendas futuras.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <History aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Trilha preservada</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-outline">A justificativa, o autor e o momento da alteração ficam no histórico financeiro.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Efeito no recebimento</p>
                  <p className="mt-1 text-xs leading-5 text-outline">
                    {confirmado !== null
                      ? "Como já houve confirmação, o recebimento original permanece e qualquer diferença vira um ajuste separado."
                      : "Como ainda não houve confirmação, o recebimento previsto acompanha o novo líquido."}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
