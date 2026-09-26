import {
  Ban,
  BadgePercent,
  History,
  PencilLine,
  Repeat,
  ShoppingBag,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChipRecebimento, MarcaTaxaManual } from "@/components/financeiro/chips";
import { ConfirmarRecebimento } from "@/components/financeiro/confirmar-recebimento";
import { BotaoLink } from "@/components/ui/button";
import { CardCorpo } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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

function Linha({
  rotulo,
  children,
  destaque = false,
}: {
  rotulo: string;
  children: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-1.5 rounded-[var(--radius-controle)] px-3 py-2.5 text-sm sm:grid-cols-[minmax(8rem,.8fr)_minmax(0,1.2fr)] sm:items-baseline sm:gap-3",
        destaque ? "border border-primary-fixed bg-selecao" : "bg-surface",
      )}
    >
      <span className={cn("min-w-0 break-words", destaque ? "font-medium text-on-surface" : "text-on-surface-variant")}>{rotulo}</span>
      <span className={cn("tabular min-w-0 break-words sm:text-right", destaque ? "font-semibold text-on-surface" : "text-on-surface")}>{children}</span>
    </div>
  );
}

function Metrica({
  icone: Icone,
  rotulo,
  valor,
  tom = "neutro",
}: {
  icone: typeof Wallet;
  rotulo: string;
  valor: string;
  tom?: "neutro" | "positivo" | "negativo" | "atencao";
}) {
  return (
    <div className="premium-interactive min-w-0 rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 shadow-[0_14px_30px_-28px_rgba(8,41,76,.34)]">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="rotulo min-w-0 break-words text-[0.65rem] text-outline">{rotulo}</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
          <Icone aria-hidden="true" size={15} strokeWidth={1.75} />
        </span>
      </div>
      <p
        className={cn(
          "tabular mt-3 min-w-0 break-words text-xl font-semibold tracking-[-0.025em]",
          tom === "positivo" && "text-positivo",
          tom === "negativo" && "text-negativo",
          tom === "atencao" && "text-atencao",
          tom === "neutro" && "text-on-surface",
        )}
      >
        {valor}
      </p>
    </div>
  );
}

export default async function PaginaVenda({ params }: Props) {
  const { id } = await params;
  const [venda, podeFinanceiro] = await Promise.all([vendaPorId(id), ehFinanceira()]);

  if (!venda) notFound();

  const recebimento = venda.recebimentos.find((r) => r.situacao !== "cancelado") ?? null;
  const emAberto =
    recebimento !== null &&
    (recebimento.situacao === "previsto" || recebimento.situacao === "pendente");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <LinkDeVoltar href="/financeiro/vendas">Voltar para vendas</LinkDeVoltar>

      <CabecalhoDePagina
        icone={ShoppingBag}
        rotulo="Venda"
        titulo={venda.paciente}
        descricao={
          <>
            <span className="font-medium text-on-surface">{venda.procedimento}</span> · registrada em {formatarData(venda.dataVenda)}. Valores de negociação, taxa e recebimento permanecem separados para leitura financeira correta.
          </>
        }
        acoes={
          podeFinanceiro ? (
            <>
              {/* Sem pré-carregamento: as duas telas dependem de o recebimento
                  estar confirmado, e a confirmação acontece nesta mesma tela.
                  Pré-carregada antes, a de pagamento abria dizendo
                  "Recebimento ainda ajustável" depois de confirmado. */}
              <BotaoLink href={`/financeiro/vendas/${venda.id}/alterar-pagamento`} prefetch={false} variante="secundaria" tamanho="sm">
                <Repeat aria-hidden="true" size={15} strokeWidth={1.75} />
                Alterar forma de pagamento
              </BotaoLink>
              {formaUsaCartao(venda.forma) ? (
                <BotaoLink href={`/financeiro/vendas/${venda.id}/alterar-taxa`} prefetch={false} variante="contorno" tamanho="sm">
                  <PencilLine aria-hidden="true" size={15} strokeWidth={1.75} />
                  Alterar taxa
                </BotaoLink>
              ) : null}
            </>
          ) : undefined
        }
        meta={
          <>
            <SeloHero tom="informativo">{ROTULO_FORMA[venda.forma]}{venda.parcelas > 1 ? ` · ${venda.parcelas}x` : ""}</SeloHero>
            <SeloHero tom="positivo">Líquido {formatarMoeda(venda.valorLiquido)}</SeloHero>
            {recebimento ? <ChipRecebimento situacao={recebimento.situacao} /> : <SeloHero tom="negativo">Recebimento cancelado</SeloHero>}
            {venda.exemplo ? <SeloHero tom="atencao">Dado demonstrativo</SeloHero> : null}
          </>
        }
      />

      <section aria-labelledby="resumo-venda">
        <h2 id="resumo-venda" className="sr-only">Resumo financeiro da venda</h2>
        <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <Metrica icone={ShoppingBag} rotulo="Valor negociado" valor={formatarMoeda(venda.valorFinal)} />
          <Metrica
            icone={BadgePercent}
            rotulo="Taxa"
            // A taxa não é despesa: é dedução do líquido, com "−" e sem o vermelho
            // do dinheiro que sai (AGENTS §7.3).
            valor={formaUsaCartao(venda.forma) && venda.taxaValor > 0 ? `− ${formatarMoeda(venda.taxaValor)}` : formatarMoeda(0)}
            tom="neutro"
          />
          <Metrica icone={Wallet} rotulo="Líquido clínica" valor={formatarMoeda(venda.valorLiquido)} tom="positivo" />
          <Metrica
            icone={History}
            rotulo="Alterações"
            valor={String(venda.alteracoes.length)}
            tom={venda.alteracoes.length > 0 ? "atencao" : "neutro"}
          />
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <CardRecolhivel id="venda-composicao-da-venda" titulo="Composição da venda" descricao="Do valor original ao líquido efetivo da clínica."
        >
          <CardCorpo className="flex min-w-0 flex-col gap-2.5">
            <Linha rotulo="Valor original">{formatarMoeda(venda.valorOriginal)}</Linha>
            {venda.desconto > 0 ? <Linha rotulo="Desconto">− {formatarMoeda(venda.desconto)}</Linha> : null}
            <Linha rotulo="Valor final negociado" destaque>{formatarMoeda(venda.valorFinal)}</Linha>

            <div className="my-1 border-t border-card-border" />
            <Linha rotulo="Forma de pagamento">
              {ROTULO_FORMA[venda.forma]}{venda.parcelas > 1 ? ` em ${venda.parcelas}x` : ""}
            </Linha>

            {formaUsaCartao(venda.forma) ? (
              <>
                <Linha rotulo={`Taxa do cartão (${formatarPercentual(bpDoBanco(venda.taxaPercentual))})`}>
                  − {formatarMoeda(venda.taxaValor)}
                </Linha>
                <Linha rotulo="Líquido para a clínica" destaque>
                  <span className="text-positivo">{formatarMoeda(venda.valorLiquido)}</span>
                </Linha>
                {venda.parcelas > 1 ? (
                  <p className="break-words rounded-[var(--radius-controle)] border border-informativo-borda bg-informativo-fundo px-3 py-2.5 text-xs leading-5 text-informativo-texto">
                    A operadora antecipa: {venda.parcelas} parcelas da paciente e um repasse único para a clínica.
                  </p>
                ) : null}
              </>
            ) : (
              <Linha rotulo="Líquido para a clínica" destaque>
                <span className="text-positivo">{formatarMoeda(venda.valorLiquido)}</span>
              </Linha>
            )}

            {venda.taxaManual ? (
              <div className="mt-1 flex min-w-0 flex-col gap-1.5 rounded-[var(--radius-controle)] border border-atencao-borda bg-atencao-fundo p-3">
                <MarcaTaxaManual />
                {venda.taxaJustificativa ? <p className="break-words text-xs leading-5 text-atencao">{venda.taxaJustificativa}</p> : null}
              </div>
            ) : null}

            {venda.observacoes ? (
              <div className="mt-1 min-w-0 border-t border-card-border pt-3">
                <p className="rotulo text-[0.65rem] text-outline">Observações</p>
                <p className="mt-2 break-words text-xs leading-5 whitespace-pre-line text-on-surface-variant">{venda.observacoes}</p>
              </div>
            ) : null}
          </CardCorpo>
        </CardRecolhivel>

        <CardRecolhivel id="venda-recebimento" titulo="Recebimento" descricao="Um registro pelo valor líquido; cartão parcelado continua sendo um repasse para a clínica."
        >
          <CardCorpo className="flex min-w-0 flex-col gap-4">
            {recebimento ? (
              <>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[var(--radius-controle)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-3 py-3 shadow-[0_10px_24px_-22px_rgba(8,41,76,.3)]">
                  <ChipRecebimento situacao={recebimento.situacao} />
                  <span className="tabular min-w-0 break-words text-xs text-outline">
                    {recebimento.recebidoEm
                      ? `entrou em ${formatarData(recebimento.recebidoEm)}`
                      : `previsto para ${formatarData(recebimento.vencimento)}`}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <Linha rotulo="Bruto">{formatarMoeda(recebimento.valor)}</Linha>
                  {recebimento.taxaValor > 0 ? <Linha rotulo="Taxa">− {formatarMoeda(recebimento.taxaValor)}</Linha> : null}
                  <Linha rotulo="Líquido previsto" destaque>{formatarMoeda(recebimento.valorLiquido)}</Linha>
                  {recebimento.valorRecebido !== null ? (
                    <Linha rotulo="Efetivamente recebido" destaque>
                      <span className={recebimento.situacao === "recebido_divergencia" ? "text-atencao" : "text-positivo"}>
                        {formatarMoeda(recebimento.valorRecebido)}
                      </span>
                    </Linha>
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

                    <div className="mt-4 flex min-w-0 flex-wrap items-start gap-2">
                      <FormularioDeAcao
                        acao={mudarSituacaoRecebimento}
                        campos={{
                          recebimento_id: recebimento.id,
                          venda_id: venda.id,
                          para: recebimento.situacao === "previsto" ? "pendente" : "previsto",
                        }}
                      >
                        <BotaoDeAcao tamanho="xs" icone={<TriangleAlert strokeWidth={1.75} />}>
                          {recebimento.situacao === "previsto" ? "Marcar como pendente" : "Voltar para previsto"}
                        </BotaoDeAcao>
                      </FormularioDeAcao>

                      <FormularioDeAcao
                        acao={mudarSituacaoRecebimento}
                        campos={{ recebimento_id: recebimento.id, venda_id: venda.id, para: "cancelado" }}
                        confirmacao="Cancelar este recebimento? Ele deixa de contar como dinheiro a entrar. A venda continua registrada."
                      >
                        <BotaoDeAcao tamanho="xs" tom="silencioso" icone={<Ban strokeWidth={1.75} />}>
                          Cancelar recebimento
                        </BotaoDeAcao>
                      </FormularioDeAcao>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="break-words rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm text-negativo">
                O recebimento desta venda foi cancelado.
              </div>
            )}

            {venda.ajustes.length > 0 ? (
              <div className="min-w-0 border-t border-card-border pt-4">
                <p className="rotulo mb-3 text-primary">Ajustes financeiros</p>
                <ul className="flex min-w-0 flex-col gap-2.5">
                  {venda.ajustes.map((ajuste) => (
                    <li key={ajuste.id} className="premium-interactive min-w-0 rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-3.5 py-3 text-sm shadow-[0_10px_24px_-22px_rgba(8,41,76,.3)]">
                      <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-3">
                        <span className="min-w-0 break-words text-on-surface-variant">{formatarData(ajuste.em)}{ajuste.por ? ` · ${ajuste.por}` : ""}</span>
                        <span className={cn("tabular shrink-0 font-semibold", ajuste.valor >= 0 ? "text-positivo" : "text-negativo")}>
                          {ajuste.valor >= 0 ? "+ " : "− "}{formatarMoeda(Math.abs(ajuste.valor))}
                        </span>
                      </div>
                      <p className="mt-1.5 min-w-0 break-words text-xs leading-5 text-outline">{ajuste.motivo}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardCorpo>
        </CardRecolhivel>
      </div>

      {venda.alteracoes.length > 0 ? (
        <CardRecolhivel id="venda-historico-de-alteracoes" titulo="Histórico de alterações" descricao="Trilha imutável de mudanças financeiras registradas no banco."
        >
          <CardCorpo>
            <ol className="relative flex min-w-0 flex-col gap-3 before:absolute before:top-5 before:bottom-5 before:left-[1.08rem] before:w-px before:bg-[linear-gradient(180deg,var(--color-primary-fixed-dim),var(--color-card-border))]">
              {venda.alteracoes.map((alteracao, i) => (
                <li key={i} className="premium-interactive relative flex min-w-0 items-start gap-3 overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-3.5 py-3.5 text-sm shadow-[0_10px_24px_-22px_rgba(8,41,76,.3)] sm:px-4">
                  <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary shadow-[0_8px_18px_-16px_rgba(8,84,160,.42)]">
                    <History aria-hidden="true" size={14} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="break-words font-semibold text-on-surface">
                      {alteracao.tipo === "forma_pagamento" ? "Forma de pagamento alterada" : "Taxa alterada manualmente"}
                    </p>
                    <div className="tabular mt-2 grid min-w-0 gap-2 rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-3 py-2.5 text-xs leading-5 text-on-surface-variant sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                      <span className="min-w-0 break-words">
                        {ROTULO_FORMA[alteracao.de.forma]}{alteracao.de.parcelas > 1 ? ` ${alteracao.de.parcelas}x` : ""}
                        <span className="block text-outline">Líquido {formatarMoeda(alteracao.de.valor_liquido)}</span>
                      </span>
                      <span aria-hidden="true" className="hidden text-center font-bold text-primary sm:block">→</span>
                      <span className="min-w-0 break-words sm:text-right">
                        {ROTULO_FORMA[alteracao.para.forma]}{alteracao.para.parcelas > 1 ? ` ${alteracao.para.parcelas}x` : ""}
                        <span className="block text-outline">Líquido {formatarMoeda(alteracao.para.valor_liquido)}</span>
                      </span>
                    </div>
                    <p className="mt-2 min-w-0 break-words text-xs leading-5 text-outline">
                      {formatarData(alteracao.em)} às {formatarHora(alteracao.em)}{alteracao.por ? ` · por ${alteracao.por}` : ""} · {alteracao.motivo}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardCorpo>
        </CardRecolhivel>
      ) : null}
    </div>
  );
}
