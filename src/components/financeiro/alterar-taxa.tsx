"use client";

import { CircleAlert, LoaderCircle, PencilLine } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import {
  bpDoBanco,
  centavosDoBanco,
  custoDaTaxa,
  formatarPercentual,
  lerPercentual,
  percentualInformado,
} from "@/lib/moeda";
import { decidirEfeito } from "@/lib/venda";
import type { VendaCompleta } from "@/server/consultas/vendas";
import { alterarTaxaManual, type EstadoVenda } from "@/server/acoes/vendas";

const INICIAL: EstadoVenda = { erros: {} };

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:shadow-[0_12px_28px_-12px_rgba(8,84,160,0.68)] active:translate-y-px active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/60" />
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

function ValorFinanceiro({
  rotulo,
  valor,
  tom = "neutro",
}: {
  rotulo: string;
  valor: string;
  tom?: "neutro" | "positivo" | "negativo" | "atencao";
}) {
  return (
    <div className="rounded-[var(--radius-controle)] border border-card-border/70 bg-surface/60 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
      <p className="rotulo text-[0.64rem] text-outline">{rotulo}</p>
      <p
        className={cn(
          "tabular mt-1.5 text-base font-semibold tracking-[-0.015em]",
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

export function AlterarTaxa({
  venda,
  taxaPadraoPercentual,
  recebimentoConfirmado,
}: {
  venda: VendaCompleta;
  taxaPadraoPercentual: number | null;
  recebimentoConfirmado: number | null;
}) {
  const [estado, enviar] = useActionState(alterarTaxaManual, INICIAL);
  const [percentual, setPercentual] = useState("");

  const finalCent = Math.round(venda.valorFinal * 100);
  const bpAtual = bpDoBanco(venda.taxaPercentual);
  const bpNovo = percentualInformado(percentual) ? lerPercentual(percentual) : null;

  const taxaNovaCent = bpNovo !== null ? custoDaTaxa(finalCent, bpNovo) : null;
  const liquidoNovoCent = taxaNovaCent !== null ? finalCent - taxaNovaCent : null;

  const erros = estado.erros;

  const efeito =
    recebimentoConfirmado !== null && liquidoNovoCent !== null
      ? decidirEfeito("recebido", centavosDoBanco(recebimentoConfirmado), liquidoNovoCent)
      : null;

  return (
    <form action={enviar} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="venda_id" value={venda.id} />

      {erros.geral ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-error/25 bg-error-container px-3.5 py-3 text-sm text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <section aria-labelledby="taxa-atual" className="rounded-[var(--radius-painel)] border border-card-border/70 bg-surface-container-low/48 p-4 sm:p-5">
        <p id="taxa-atual" className="rotulo text-primary/80">Cenário atual</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <ValorFinanceiro
            rotulo="Taxa padrão da tabela"
            valor={taxaPadraoPercentual !== null ? formatarPercentual(bpDoBanco(taxaPadraoPercentual)) : "Não cadastrada"}
            tom={taxaPadraoPercentual === null ? "atencao" : "neutro"}
          />
          <ValorFinanceiro
            rotulo="Aplicada nesta venda"
            valor={`${formatarPercentual(bpAtual)} · ${formatarMoeda(venda.taxaValor)}`}
            tom={venda.taxaValor > 0 ? "negativo" : "neutro"}
          />
          <ValorFinanceiro rotulo="Líquido atual" valor={formatarMoeda(venda.valorLiquido)} tom="positivo" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.85fr)]">
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

        <div className="grid grid-cols-2 gap-3 self-end">
          <ValorFinanceiro
            rotulo="Novo custo"
            valor={taxaNovaCent !== null ? formatarMoeda(taxaNovaCent / 100) : "—"}
            tom={taxaNovaCent !== null && taxaNovaCent > 0 ? "negativo" : "neutro"}
          />
          <ValorFinanceiro
            rotulo="Novo líquido"
            valor={liquidoNovoCent !== null ? formatarMoeda(liquidoNovoCent / 100) : "—"}
            tom={liquidoNovoCent !== null ? "positivo" : "neutro"}
          />
        </div>
      </div>

      {efeito && recebimentoConfirmado !== null ? (
        <div className="rounded-[var(--radius-controle)] border border-atencao-borda/85 bg-atencao-fundo px-4 py-3 text-xs leading-5 text-atencao shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <p className="font-semibold">O recebimento já foi confirmado.</p>
          <p className="mt-1">
            O registro original fica intacto
            {efeito.tipo === "ajuste" ? (
              <>
                {" "}e entra um ajuste de{" "}
                <strong className="tabular">
                  {efeito.valorCent < 0 ? "− " : "+ "}
                  {formatarMoeda(Math.abs(efeito.valorCent) / 100)}
                </strong>
                : o novo líquido menos o valor que de fato entrou ({formatarMoeda(recebimentoConfirmado)}).
              </>
            ) : (
              ": o novo líquido é igual ao valor que entrou, e nenhum ajuste é lançado."
            )}
          </p>
        </div>
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
          defaultValue={estado.valores?.motivo ?? ""}
          placeholder="Taxa renegociada com a operadora para esta transação"
          className={AREA_TEXTO}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-card-border/70 pt-6">
        <Botao />
        <Link
          href={`/financeiro/vendas/${venda.id}`}
          className="premium-interactive inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface/75 px-6 text-sm font-semibold text-on-surface-variant shadow-[var(--shadow-cartao)] hover:border-primary-fixed-dim hover:text-primary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
