"use client";

import { ArrowRight, CircleAlert, LoaderCircle, Repeat } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
import { RodapeAcoesFormulario } from "@/components/ui/form-actions";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import { bpDoBanco, centavosDoBanco, custoDaTaxa, formatarPercentual } from "@/lib/moeda";
import {
  decidirEfeito,
  formaParcela,
  formaUsaCartao,
  FORMAS_EM_ORDEM,
  montarComparativo,
  ROTULO_FORMA,
  type FormaPagamento,
} from "@/lib/venda";
import type { TaxaParaVenda, VendaCompleta } from "@/server/consultas/vendas";
import { alterarFormaPagamento, type EstadoVenda } from "@/server/acoes/vendas";

const INICIAL: EstadoVenda = { erros: {} };

function BotaoConfirmar({ pronto }: { pronto: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !pronto}
      className="premium-interactive inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[0_12px_28px_-20px_rgba(8,84,160,.75)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Aplicando…
        </>
      ) : (
        <>
          <Repeat aria-hidden="true" size={18} strokeWidth={1.75} />
          Confirmar a mudança
        </>
      )}
    </button>
  );
}

function LinhaComparativa({ rotulo, antes, depois }: { rotulo: string; antes: string; depois: string }) {
  const mudou = antes !== depois;

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-2 rounded-[var(--radius-controle)] border px-3 py-3 text-sm", mudou ? "border-primary-fixed bg-selecao/65" : "border-card-border bg-surface")}>
      <div className="min-w-0 text-right">
        <span className="block text-[0.62rem] font-semibold tracking-[0.06em] text-outline uppercase sm:hidden">Atual</span>
        <span className="tabular block truncate text-on-surface-variant">{antes}</span>
      </div>
      <span className="flex flex-col items-center justify-center">
        <span className="rotulo max-w-full truncate text-[0.58rem] text-outline">{rotulo}</span>
        <span className={cn("mt-1 flex size-6 items-center justify-center rounded-full border", mudou ? "border-primary-fixed-dim bg-surface text-primary" : "border-card-border bg-surface-container-low text-outline")}>
          <ArrowRight aria-hidden="true" size={12} strokeWidth={1.9} />
        </span>
      </span>
      <div className="min-w-0">
        <span className="block text-[0.62rem] font-semibold tracking-[0.06em] text-outline uppercase sm:hidden">Novo</span>
        <span className={cn("tabular block truncate", mudou ? "font-semibold text-on-surface" : "text-on-surface-variant")}>{depois}</span>
      </div>
    </div>
  );
}

export function AlterarPagamento({
  venda,
  taxas,
  recebimentoConfirmado,
  semRecebimentoVivo = false,
}: {
  venda: VendaCompleta;
  taxas: TaxaParaVenda[];
  recebimentoConfirmado: number | null;
  semRecebimentoVivo?: boolean;
}) {
  const [estado, enviar] = useActionState(alterarFormaPagamento, INICIAL);
  const [forma, setForma] = useState<FormaPagamento>(venda.forma);
  const [operadora, setOperadora] = useState("");
  const [taxaId, setTaxaId] = useState("");

  const usaCartao = formaUsaCartao(forma);
  const taxasDoTipo = useMemo(() => taxas.filter((t) => t.tipo === forma), [taxas, forma]);
  const operadoras = useMemo(() => [...new Set(taxasDoTipo.map((t) => t.operadora))], [taxasDoTipo]);
  const opcoesDeParcela = taxasDoTipo.filter((t) => t.operadora === operadora);
  const taxaEscolhida = taxasDoTipo.find((t) => t.id === taxaId) ?? null;
  const finalCent = Math.round(venda.valorFinal * 100);

  const comparativo = useMemo(() => {
    const bpPadrao = usaCartao && taxaEscolhida ? bpDoBanco(taxaEscolhida.percentual) : 0;
    const bp = usaCartao ? bpPadrao : 0;
    const taxaCent = custoDaTaxa(finalCent, bp);

    return montarComparativo(
      {
        forma: venda.forma,
        parcelas: venda.parcelas,
        taxaBp: bpDoBanco(venda.taxaPercentual),
        taxaCent: Math.round(venda.taxaValor * 100),
        liquidoCent: Math.round(venda.valorLiquido * 100),
      },
      {
        forma,
        parcelas: usaCartao ? (taxaEscolhida?.parcelas ?? 1) : 1,
        taxaBp: bp,
        taxaCent,
        liquidoCent: finalCent - taxaCent,
      },
    );
  }, [venda, forma, usaCartao, taxaEscolhida, finalCent]);

  const pronto = !usaCartao || taxaEscolhida !== null;
  const erros = estado.erros;
  const efeito = recebimentoConfirmado === null
    ? null
    : decidirEfeito("recebido", centavosDoBanco(recebimentoConfirmado), comparativo.depois.liquidoCent);
  const ajusteCent = efeito?.tipo === "ajuste" ? efeito.valorCent : 0;

  return (
    <form action={enviar} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="venda_id" value={venda.id} />

      {erros.geral ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error bg-error-container px-3.5 py-3 text-sm text-on-error-container">
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <GrupoDeCampos titulo="Novo meio de pagamento" descricao="Escolha a nova forma. No cartão, selecione também a combinação de operadora e parcelamento para calcular a taxa padrão.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo id="forma" rotulo="Nova forma de pagamento" obrigatorio erro={erros.forma}>
            <select
              id="forma"
              name="forma"
              value={forma}
              onChange={(e) => {
                setForma(e.target.value as FormaPagamento);
                setOperadora("");
                setTaxaId("");
              }}
              className={cn(ENTRADA, erros.forma && ENTRADA_ERRO)}
            >
              {FORMAS_EM_ORDEM.map((f) => <option key={f} value={f}>{ROTULO_FORMA[f]}</option>)}
            </select>
          </Campo>

          {usaCartao ? (
            <>
              <Campo id="operadora" rotulo="Operadora" obrigatorio erro={erros.taxa}>
                <select
                  id="operadora"
                  value={operadora}
                  onChange={(e) => {
                    setOperadora(e.target.value);
                    const linhas = taxasDoTipo.filter((t) => t.operadora === e.target.value);
                    setTaxaId(linhas.length === 1 ? linhas[0].id : "");
                  }}
                  className={ENTRADA}
                >
                  <option value="">Escolher…</option>
                  {operadoras.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Campo>

              {formaParcela(forma) ? (
                <Campo id="parcelas_campo" rotulo="Parcelas" obrigatorio erro={erros.parcelas}>
                  <select id="parcelas_campo" value={taxaId} onChange={(e) => setTaxaId(e.target.value)} disabled={!operadora} className={ENTRADA}>
                    <option value="">Escolher…</option>
                    {opcoesDeParcela.map((t) => <option key={t.id} value={t.id}>{t.parcelas}x — taxa {formatarPercentual(bpDoBanco(t.percentual))}</option>)}
                  </select>
                </Campo>
              ) : null}

              <input type="hidden" name="taxa_cartao_id" value={taxaId} />
              <input type="hidden" name="parcelas" value={taxaEscolhida ? String(taxaEscolhida.parcelas) : "1"} />
            </>
          ) : (
            <input type="hidden" name="parcelas" value="1" />
          )}
        </div>
      </GrupoDeCampos>

      <section aria-labelledby="comparativo-pagamento" className="premium-panel overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-card-border pb-4">
          <div>
            <p className="rotulo text-primary">Impacto da mudança</p>
            <h3 id="comparativo-pagamento" className="mt-1.5 text-base font-semibold text-on-surface">Antes × novo cenário</h3>
          </div>
          <div className="hidden grid-cols-[1fr_2.5rem_1fr] gap-2 text-[0.62rem] font-semibold tracking-[0.06em] text-outline uppercase sm:grid">
            <span className="text-right">Atual</span><span /><span>Novo</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <LinhaComparativa
            rotulo="Forma"
            antes={`${ROTULO_FORMA[comparativo.antes.forma]}${comparativo.antes.parcelas > 1 ? ` ${comparativo.antes.parcelas}x` : ""}`}
            depois={pronto ? `${ROTULO_FORMA[comparativo.depois.forma]}${comparativo.depois.parcelas > 1 ? ` ${comparativo.depois.parcelas}x` : ""}` : "—"}
          />
          <LinhaComparativa
            rotulo="Taxa"
            antes={`${formatarPercentual(comparativo.antes.taxaBp)} · ${formatarMoeda(comparativo.antes.taxaCent / 100)}`}
            depois={pronto ? `${formatarPercentual(comparativo.depois.taxaBp)} · ${formatarMoeda(comparativo.depois.taxaCent / 100)}` : "—"}
          />
          <LinhaComparativa rotulo="Líquido" antes={formatarMoeda(comparativo.antes.liquidoCent / 100)} depois={pronto ? formatarMoeda(comparativo.depois.liquidoCent / 100) : "—"} />
        </div>

        {pronto && (comparativo.diferencaCent !== 0 || ajusteCent !== 0) ? (
          <div className={cn("mt-4 rounded-[var(--radius-controle)] border px-3.5 py-3 text-xs leading-5", comparativo.diferencaCent < 0 || ajusteCent < 0 ? "border-atencao-borda bg-atencao-fundo text-atencao" : "border-positivo-borda bg-positivo-fundo text-positivo")}>
            {comparativo.diferencaCent !== 0 ? <p>A clínica passa a receber <strong className="tabular">{formatarMoeda(Math.abs(comparativo.diferencaCent) / 100)}</strong> {comparativo.diferencaCent < 0 ? "a menos" : "a mais"}.</p> : null}
            <p className={comparativo.diferencaCent !== 0 ? "mt-1" : undefined}>
              {semRecebimentoVivo
                ? "Esta venda não tem recebimento ativo: só a venda muda."
                : recebimentoConfirmado !== null
                  ? ajusteCent !== 0
                    ? <>Como o recebimento já foi confirmado, entra um ajuste de <strong className="tabular">{ajusteCent < 0 ? "− " : "+ "}{formatarMoeda(Math.abs(ajusteCent) / 100)}</strong>, calculado contra o valor que efetivamente entrou ({formatarMoeda(recebimentoConfirmado)}).</>
                    : "O recebimento confirmado já coincide com o novo líquido; nenhum ajuste será lançado."
                  : "O recebimento previsto será atualizado junto com a venda."}
            </p>
          </div>
        ) : null}
      </section>

      <GrupoDeCampos titulo="Justificativa" descricao="A mudança fica auditável no histórico da venda, com autor, data e hora.">
        <Campo id="motivo" rotulo="Motivo da alteração" obrigatorio erro={erros.motivo}>
          <textarea id="motivo" name="motivo" maxLength={500} defaultValue={estado.valores?.motivo ?? ""} placeholder="A paciente preferiu parcelar no cartão" className={AREA_TEXTO} />
        </Campo>
      </GrupoDeCampos>

      <RodapeAcoesFormulario>
        <BotaoConfirmar pronto={pronto} />
        <Link href={`/financeiro/vendas/${venda.id}`} className="premium-interactive inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface px-6 text-sm font-semibold text-on-surface-variant hover:border-primary-fixed-dim hover:bg-selecao hover:text-primary">Cancelar</Link>
      </RodapeAcoesFormulario>
    </form>
  );
}
