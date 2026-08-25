"use client";

import { CircleAlert, LoaderCircle, PencilLine } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import { bpDoBanco, custoDaTaxa, formatarPercentual, lerPercentual } from "@/lib/moeda";
import type { VendaCompleta } from "@/server/consultas/vendas";
import { alterarTaxaManual, type EstadoVenda } from "@/server/acoes/vendas";

const INICIAL: EstadoVenda = { erros: {} };

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Aplicando…
        </>
      ) : (
        <>
          <PencilLine aria-hidden="true" size={18} strokeWidth={1.75} />
          Aplicar a nova taxa
        </>
      )}
    </button>
  );
}

export function AlterarTaxa({
  venda,
  taxaPadraoPercentual,
  recebimentoConfirmado,
}: {
  venda: VendaCompleta;
  /** O percentual da tabela padrão para esta combinação, quando existir. */
  taxaPadraoPercentual: number | null;
  recebimentoConfirmado: number | null;
}) {
  const [estado, enviar] = useActionState(alterarTaxaManual, INICIAL);
  const [percentual, setPercentual] = useState("");

  const finalCent = Math.round(venda.valorFinal * 100);
  const bpAtual = bpDoBanco(venda.taxaPercentual);
  const bpNovo = lerPercentual(percentual);

  const taxaNovaCent = bpNovo !== null ? custoDaTaxa(finalCent, bpNovo) : null;
  const liquidoNovoCent = taxaNovaCent !== null ? finalCent - taxaNovaCent : null;

  const erros = estado.erros;

  return (
    <form action={enviar} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="venda_id" value={venda.id} />

      {erros.geral ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-on-surface-variant">
            Taxa padrão da tabela
            {taxaPadraoPercentual === null ? " (combinação não cadastrada)" : ""}
          </span>
          <span className="tabular text-on-surface">
            {taxaPadraoPercentual !== null
              ? formatarPercentual(bpDoBanco(taxaPadraoPercentual))
              : "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-on-surface-variant">Taxa aplicada hoje nesta venda</span>
          <span className="tabular text-on-surface">
            {formatarPercentual(bpAtual)} · {formatarMoeda(venda.taxaValor)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-on-surface-variant">Líquido de hoje</span>
          <span className="tabular text-on-surface">{formatarMoeda(venda.valorLiquido)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo
          id="taxa_percentual"
          rotulo="Nova taxa (%)"
          obrigatorio
          erro={erros.taxa}
          dica="A tabela padrão não muda — só esta venda."
        >
          <input
            id="taxa_percentual"
            name="taxa_percentual"
            type="text"
            inputMode="decimal"
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            placeholder="6,5"
            className={cn(ENTRADA, "tabular", erros.taxa && ENTRADA_ERRO)}
          />
        </Campo>

        <div className="flex flex-col justify-end gap-1 pb-1 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-on-surface-variant">Novo custo da taxa</span>
            <span className="tabular text-on-surface">
              {taxaNovaCent !== null ? formatarMoeda(taxaNovaCent / 100) : "—"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-on-surface-variant">Novo líquido</span>
            <span className="tabular font-semibold text-positivo">
              {liquidoNovoCent !== null ? formatarMoeda(liquidoNovoCent / 100) : "—"}
            </span>
          </div>
        </div>
      </div>

      {recebimentoConfirmado !== null && liquidoNovoCent !== null ? (
        <p className="rounded-[var(--radius-cartao)] border border-atencao-borda bg-atencao-fundo px-3.5 py-2.5 text-xs text-atencao">
          O recebimento já foi confirmado. O registro original fica intacto e a
          diferença vira um ajuste financeiro.
        </p>
      ) : null}

      <Campo
        id="motivo"
        rotulo="Justificativa"
        obrigatorio
        erro={erros.motivo}
        dica="Fica registrada com seu nome, data e hora, no histórico da venda."
      >
        <textarea
          id="motivo"
          name="motivo"
          maxLength={500}
          placeholder="Taxa renegociada com a operadora para esta transação"
          className={AREA_TEXTO}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-6">
        <Botao />
        <Link
          href={`/financeiro/vendas/${venda.id}`}
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-6 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
