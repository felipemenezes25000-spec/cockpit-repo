import { ArrowLeft, Ban, History, PencilLine, Repeat, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChipRecebimento, MarcaTaxaManual } from "@/components/financeiro/chips";
import { ConfirmarRecebimento } from "@/components/financeiro/confirmar-recebimento";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { ehFinanceira } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { chaveDoDia, hoje } from "@/lib/dates";
import { formatarData, formatarHora, formatarMoeda } from "@/lib/format";
import { bpDoBanco, formatarPercentual } from "@/lib/moeda";
import { formaUsaCartao, ROTULO_FORMA } from "@/lib/venda";
import { mudarSituacaoRecebimento } from "@/server/acoes/vendas";
import { vendaPorId } from "@/server/consultas/vendas";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const venda = await vendaPorId(id);
  return { title: venda ? `Venda — ${venda.paciente}` : "Venda" };
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-on-surface-variant">{rotulo}</span>
      <span className="tabular text-right text-on-surface">{children}</span>
    </div>
  );
}

export default async function PaginaVenda({ params }: Props) {
  const { id } = await params;
  const [venda, podeFinanceiro] = await Promise.all([vendaPorId(id), ehFinanceira()]);

  if (!venda) notFound();

  const recebimento =
    venda.recebimentos.find((r) => r.situacao !== "cancelado") ?? null;
  const emAberto =
    recebimento !== null &&
    (recebimento.situacao === "previsto" || recebimento.situacao === "pendente");

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/financeiro/vendas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para as vendas
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="t-display text-primary">
            <Link href={`/pacientes/${venda.pacienteId}`} className="hover:underline">
              {venda.paciente}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-outline">
            {venda.procedimento} · venda de {formatarData(venda.dataVenda)}
            {venda.exemplo ? " · exemplo" : ""}
          </p>
        </div>

        {podeFinanceiro ? (
          <div className="flex flex-wrap gap-2">
            <BotaoLink
              href={`/financeiro/vendas/${venda.id}/alterar-pagamento`}
              variante="secundaria"
              tamanho="sm"
            >
              <Repeat aria-hidden="true" size={15} strokeWidth={1.75} />
              Alterar forma de pagamento
            </BotaoLink>
            {formaUsaCartao(venda.forma) ? (
              <BotaoLink
                href={`/financeiro/vendas/${venda.id}/alterar-taxa`}
                variante="contorno"
                tamanho="sm"
              >
                <PencilLine aria-hidden="true" size={15} strokeWidth={1.75} />
                Alterar taxa
              </BotaoLink>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* A conta ------------------------------------------------------- */}
        <Card>
          <CardCabecalho titulo="A conta" />
          <CardCorpo className="flex flex-col gap-2.5">
            <Linha rotulo="Valor original">{formatarMoeda(venda.valorOriginal)}</Linha>
            {venda.desconto > 0 ? (
              <Linha rotulo="Desconto">− {formatarMoeda(venda.desconto)}</Linha>
            ) : null}
            <Linha rotulo="Valor final negociado">{formatarMoeda(venda.valorFinal)}</Linha>

            <div className="border-t border-card-border pt-2.5">
              <Linha rotulo="Forma de pagamento">
                {ROTULO_FORMA[venda.forma]}
                {venda.parcelas > 1 ? ` em ${venda.parcelas}x` : ""}
              </Linha>
            </div>

            {formaUsaCartao(venda.forma) ? (
              <>
                <Linha rotulo={`Taxa do cartão (${formatarPercentual(bpDoBanco(venda.taxaPercentual))})`}>
                  − {formatarMoeda(venda.taxaValor)}
                </Linha>
                <div className="flex items-baseline justify-between gap-3 border-t border-card-border pt-2.5 text-sm">
                  <span className="font-medium text-on-surface">Líquido para a clínica</span>
                  <span className="tabular font-semibold text-positivo">
                    {formatarMoeda(venda.valorLiquido)}
                  </span>
                </div>
                {venda.parcelas > 1 ? (
                  <p className="text-xs text-outline">
                    A operadora antecipa: {venda.parcelas} parcelas da paciente, um
                    repasse só para a clínica.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex items-baseline justify-between gap-3 border-t border-card-border pt-2.5 text-sm">
                <span className="font-medium text-on-surface">Líquido para a clínica</span>
                <span className="tabular font-semibold text-positivo">
                  {formatarMoeda(venda.valorLiquido)}
                </span>
              </div>
            )}

            {venda.taxaManual ? (
              <div className="mt-1 flex flex-col gap-1.5 rounded-[var(--radius-cartao)] bg-atencao-fundo p-3">
                <MarcaTaxaManual />
                {venda.taxaJustificativa ? (
                  <p className="text-xs text-atencao">{venda.taxaJustificativa}</p>
                ) : null}
              </div>
            ) : null}

            {venda.observacoes ? (
              <p className="mt-1 border-t border-card-border pt-2.5 text-xs whitespace-pre-line text-on-surface-variant">
                {venda.observacoes}
              </p>
            ) : null}
          </CardCorpo>
        </Card>

        {/* O recebimento --------------------------------------------------- */}
        <Card>
          <CardCabecalho
            titulo="Recebimento"
            descricao="Um só, pelo valor líquido — cartão parcelado é antecipado."
          />
          <CardCorpo className="flex flex-col gap-4">
            {recebimento ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ChipRecebimento situacao={recebimento.situacao} />
                  <span className="tabular text-sm text-outline">
                    {recebimento.recebidoEm
                      ? `entrou em ${formatarData(recebimento.recebidoEm)}`
                      : `previsto para ${formatarData(recebimento.vencimento)}`}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <Linha rotulo="Bruto">{formatarMoeda(recebimento.valor)}</Linha>
                  {recebimento.taxaValor > 0 ? (
                    <Linha rotulo="Taxa">− {formatarMoeda(recebimento.taxaValor)}</Linha>
                  ) : null}
                  <Linha rotulo="Líquido previsto">
                    {formatarMoeda(recebimento.valorLiquido)}
                  </Linha>
                  {recebimento.valorRecebido !== null ? (
                    <div
                      className={cn(
                        "flex items-baseline justify-between gap-3 border-t border-card-border pt-2 text-sm",
                      )}
                    >
                      <span className="font-medium text-on-surface">Efetivamente recebido</span>
                      <span
                        className={cn(
                          "tabular font-semibold",
                          recebimento.situacao === "recebido_divergencia"
                            ? "text-atencao"
                            : "text-positivo",
                        )}
                      >
                        {formatarMoeda(recebimento.valorRecebido)}
                      </span>
                    </div>
                  ) : null}
                </div>

                {emAberto && podeFinanceiro ? (
                  <div className="border-t border-card-border pt-4">
                    <ConfirmarRecebimento
                      recebimentoId={recebimento.id}
                      vendaId={venda.id}
                      liquidoPrevisto={recebimento.valorLiquido}
                      dataPadrao={chaveDoDia(hoje())}
                    />

                    <div className="mt-4 flex flex-wrap items-start gap-2">
                      <FormularioDeAcao
                        acao={mudarSituacaoRecebimento}
                        campos={{
                          recebimento_id: recebimento.id,
                          venda_id: venda.id,
                          para: recebimento.situacao === "previsto" ? "pendente" : "previsto",
                        }}
                      >
                        <BotaoDeAcao tamanho="xs" icone={TriangleAlert}>
                          {recebimento.situacao === "previsto"
                            ? "Marcar como pendente"
                            : "Voltar para previsto"}
                        </BotaoDeAcao>
                      </FormularioDeAcao>

                      <FormularioDeAcao
                        acao={mudarSituacaoRecebimento}
                        campos={{ recebimento_id: recebimento.id, venda_id: venda.id, para: "cancelado" }}
                        confirmacao="Cancelar este recebimento? Ele deixa de contar como dinheiro a entrar. A venda continua registrada."
                      >
                        <BotaoDeAcao tamanho="xs" tom="silencioso" icone={Ban}>
                          Cancelar recebimento
                        </BotaoDeAcao>
                      </FormularioDeAcao>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">
                O recebimento desta venda foi cancelado.
              </p>
            )}

            {venda.ajustes.length > 0 ? (
              <div className="border-t border-card-border pt-4">
                <p className="rotulo mb-2">Ajustes financeiros</p>
                <ul className="flex flex-col gap-2">
                  {venda.ajustes.map((ajuste) => (
                    <li key={ajuste.id} className="text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-on-surface-variant">
                          {formatarData(ajuste.em)}
                          {ajuste.por ? ` · ${ajuste.por}` : ""}
                        </span>
                        <span
                          className={cn(
                            "tabular font-medium",
                            ajuste.valor >= 0 ? "text-positivo" : "text-atencao",
                          )}
                        >
                          {ajuste.valor >= 0 ? "+ " : "− "}
                          {formatarMoeda(Math.abs(ajuste.valor))}
                        </span>
                      </div>
                      <p className="text-xs text-outline">{ajuste.motivo}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardCorpo>
        </Card>
      </div>

      {/* Histórico --------------------------------------------------------- */}
      {venda.alteracoes.length > 0 ? (
        <Card className="mt-6">
          <CardCabecalho
            titulo="Histórico de alterações"
            descricao="Imutável: o banco não aceita editar nem apagar estas linhas."
          />
          <CardCorpo>
            <ol className="flex flex-col gap-4">
              {venda.alteracoes.map((alteracao, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <History
                    aria-hidden="true"
                    size={15}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-outline-variant"
                  />
                  <div className="min-w-0">
                    <p className="text-on-surface">
                      {alteracao.tipo === "forma_pagamento"
                        ? "Forma de pagamento alterada"
                        : "Taxa alterada manualmente"}
                      :{" "}
                      <span className="tabular">
                        {ROTULO_FORMA[alteracao.de.forma]}
                        {alteracao.de.parcelas > 1 ? ` ${alteracao.de.parcelas}x` : ""} (líquido{" "}
                        {formatarMoeda(alteracao.de.valor_liquido)}) →{" "}
                        {ROTULO_FORMA[alteracao.para.forma]}
                        {alteracao.para.parcelas > 1 ? ` ${alteracao.para.parcelas}x` : ""} (líquido{" "}
                        {formatarMoeda(alteracao.para.valor_liquido)})
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-outline">
                      {formatarData(alteracao.em)} às {formatarHora(alteracao.em)}
                      {alteracao.por ? ` · por ${alteracao.por}` : ""} · {alteracao.motivo}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardCorpo>
        </Card>
      ) : null}
    </div>
  );
}
