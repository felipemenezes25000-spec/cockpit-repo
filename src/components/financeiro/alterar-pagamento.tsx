"use client";

import { ArrowRight, CircleAlert, LoaderCircle, Repeat } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
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
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
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

/** Uma linha do comparativo: antes → depois, com destaque quando muda. */
function LinhaComparativa({
  rotulo,
  antes,
  depois,
}: {
  rotulo: string;
  antes: string;
  depois: string;
}) {
  const mudou = antes !== depois;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
      <span className="text-right text-on-surface-variant">{antes}</span>
      <span className="flex flex-col items-center px-2">
        <span className="rotulo text-[0.625rem]">{rotulo}</span>
        <ArrowRight
          aria-hidden="true"
          size={14}
          strokeWidth={1.75}
          className={mudou ? "text-primary" : "text-outline-variant"}
        />
      </span>
      <span className={cn("tabular", mudou ? "font-semibold text-on-surface" : "text-on-surface-variant")}>
        {depois}
      </span>
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
  /** O valor que de fato entrou, quando confirmado — muda o aviso do rodapé. */
  recebimentoConfirmado: number | null;
  /** Sem recebimento ativo (cancelado): a função do banco muda só a venda. */
  semRecebimentoVivo?: boolean;
}) {
  const [estado, enviar] = useActionState(alterarFormaPagamento, INICIAL);

  const [forma, setForma] = useState<FormaPagamento>(venda.forma);
  const [operadora, setOperadora] = useState("");
  const [taxaId, setTaxaId] = useState("");

  const usaCartao = formaUsaCartao(forma);
  const taxasDoTipo = useMemo(() => taxas.filter((t) => t.tipo === forma), [taxas, forma]);
  const operadoras = useMemo(
    () => [...new Set(taxasDoTipo.map((t) => t.operadora))],
    [taxasDoTipo],
  );
  const opcoesDeParcela = taxasDoTipo.filter((t) => t.operadora === operadora);
  const taxaEscolhida = taxasDoTipo.find((t) => t.id === taxaId) ?? null;

  const finalCent = Math.round(venda.valorFinal * 100);

  const comparativo = useMemo(() => {
    const bpPadrao = usaCartao && taxaEscolhida ? bpDoBanco(taxaEscolhida.percentual) : 0;
    // A troca de forma usa sempre a taxa padrão; taxa manual tem tela própria.
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

  // O ajuste que o banco vai gravar é `novo líquido − valor que entrou`, não a
  // diferença de líquidos do comparativo (AGENTS.md §8.4). A tela mostra o
  // número que será gravado — com divergência ou ajuste anterior, os dois
  // não batem, e a pessoa precisa ver isso antes de confirmar.
  const efeito =
    recebimentoConfirmado === null
      ? null
      : decidirEfeito(
          "recebido",
          centavosDoBanco(recebimentoConfirmado),
          comparativo.depois.liquidoCent,
        );
  const ajusteCent = efeito?.tipo === "ajuste" ? efeito.valorCent : 0;

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
            {FORMAS_EM_ORDEM.map((f) => (
              <option key={f} value={f}>
                {ROTULO_FORMA[f]}
              </option>
            ))}
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
                {operadoras.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Campo>

            {formaParcela(forma) ? (
              <Campo id="parcelas_campo" rotulo="Parcelas" obrigatorio erro={erros.parcelas}>
                <select
                  id="parcelas_campo"
                  value={taxaId}
                  onChange={(e) => setTaxaId(e.target.value)}
                  disabled={!operadora}
                  className={ENTRADA}
                >
                  <option value="">Escolher…</option>
                  {opcoesDeParcela.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.parcelas}x — taxa {formatarPercentual(bpDoBanco(t.percentual))}
                    </option>
                  ))}
                </select>
              </Campo>
            ) : null}

            <input type="hidden" name="taxa_cartao_id" value={taxaId} />
            <input
              type="hidden"
              name="parcelas"
              value={taxaEscolhida ? String(taxaEscolhida.parcelas) : "1"}
            />
          </>
        ) : (
          <input type="hidden" name="parcelas" value="1" />
        )}
      </div>

      {/* Comparativo: o que muda, lado a lado, antes de confirmar. */}
      <div className="flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-5">
        <p className="rotulo">Antes → depois</p>
        <LinhaComparativa
          rotulo="Forma"
          antes={`${ROTULO_FORMA[comparativo.antes.forma]}${comparativo.antes.parcelas > 1 ? ` ${comparativo.antes.parcelas}x` : ""}`}
          depois={
            pronto
              ? `${ROTULO_FORMA[comparativo.depois.forma]}${comparativo.depois.parcelas > 1 ? ` ${comparativo.depois.parcelas}x` : ""}`
              : "—"
          }
        />
        <LinhaComparativa
          rotulo="Taxa"
          antes={`${formatarPercentual(comparativo.antes.taxaBp)} · ${formatarMoeda(comparativo.antes.taxaCent / 100)}`}
          depois={
            pronto
              ? `${formatarPercentual(comparativo.depois.taxaBp)} · ${formatarMoeda(comparativo.depois.taxaCent / 100)}`
              : "—"
          }
        />
        <LinhaComparativa
          rotulo="Líquido"
          antes={formatarMoeda(comparativo.antes.liquidoCent / 100)}
          depois={pronto ? formatarMoeda(comparativo.depois.liquidoCent / 100) : "—"}
        />

        {pronto && (comparativo.diferencaCent !== 0 || ajusteCent !== 0) ? (
          <p
            className={cn(
              "border-t border-card-border pt-3 text-xs",
              comparativo.diferencaCent < 0 || ajusteCent < 0 ? "text-atencao" : "text-positivo",
            )}
          >
            {comparativo.diferencaCent !== 0 ? (
              <>
                A clínica passa a receber{" "}
                <strong className="tabular">
                  {formatarMoeda(Math.abs(comparativo.diferencaCent) / 100)}
                </strong>{" "}
                {comparativo.diferencaCent < 0 ? "a menos" : "a mais"}.{" "}
              </>
            ) : null}
            {semRecebimentoVivo ? (
              "Esta venda não tem recebimento ativo (foi cancelado): só a venda muda, nenhum recebimento é tocado."
            ) : recebimentoConfirmado !== null ? (
              ajusteCent !== 0 ? (
                <>
                  Como o recebimento já foi confirmado, o registro original fica intacto e
                  entra um ajuste de{" "}
                  <strong className="tabular">
                    {ajusteCent < 0 ? "− " : "+ "}
                    {formatarMoeda(Math.abs(ajusteCent) / 100)}
                  </strong>
                  : o novo líquido menos o valor que de fato entrou (
                  {formatarMoeda(recebimentoConfirmado)}).
                </>
              ) : (
                "Como o recebimento já foi confirmado e o novo líquido é igual ao valor que entrou, nenhum ajuste é lançado."
              )
            ) : (
              "O recebimento previsto será atualizado."
            )}
          </p>
        ) : null}
      </div>

      <Campo
        id="motivo"
        rotulo="Motivo da alteração"
        obrigatorio
        erro={erros.motivo}
        dica="Fica no histórico da venda, com seu nome, data e hora."
      >
        <textarea
          id="motivo"
          name="motivo"
          maxLength={500}
          defaultValue={estado.valores?.motivo ?? ""}
          placeholder="A paciente preferiu parcelar no cartão"
          className={AREA_TEXTO}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-6">
        <BotaoConfirmar pronto={pronto} />
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
