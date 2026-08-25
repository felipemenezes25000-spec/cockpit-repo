import { Ban, ReceiptText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ChipDespesa } from "./chips";
import { PagarDespesa } from "./pagar-despesa";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { ROTULO_CATEGORIA } from "@/lib/despesa";
import { descreverPrazo, formatarData, formatarMoeda } from "@/lib/format";
import { ROTULO_FORMA } from "@/lib/venda";
import { mudarSituacaoDespesa } from "@/server/acoes/despesas";
import type { Despesa } from "@/server/consultas/despesas";

export function ListaDespesas({
  despesas,
  dataPadrao,
}: {
  despesas: Despesa[];
  dataPadrao: string;
}) {
  if (despesas.length === 0) {
    return (
      <EstadoVazio
        icone={ReceiptText}
        titulo="Nenhuma despesa neste mês"
        descricao="Registre as contas do mês para o resultado de caixa fechar."
        acao={
          <BotaoLink href="/financeiro/despesas/nova" variante="primaria" tamanho="sm">
            Registrar despesa
          </BotaoLink>
        }
      />
    );
  }

  return (
    <ul aria-label="Despesas" className="flex flex-col gap-3">
      {despesas.map((despesa) => (
        <li
          key={despesa.id}
          className={cn(
            "flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)]",
            despesa.situacao === "cancelada" && "opacity-60",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-on-surface">{despesa.descricao}</span>
                <ChipDespesa situacao={despesa.situacao} venceEmDias={despesa.venceEmDias} />
                {despesa.exemplo ? (
                  <span className="rounded-[var(--radius-tag)] border border-dashed border-outline-variant px-1.5 py-0.5 text-[0.6875rem] text-outline">
                    exemplo
                  </span>
                ) : null}
              </div>

              <p className="tabular mt-1 text-xs text-outline">
                {ROTULO_CATEGORIA[despesa.categoria]}
                {despesa.situacao === "paga" && despesa.pagoEm
                  ? ` · paga em ${formatarData(despesa.pagoEm)}${despesa.forma ? ` (${ROTULO_FORMA[despesa.forma]})` : ""}`
                  : ` · vence ${formatarData(despesa.vencimento)} (${descreverPrazo(despesa.venceEmDias)})`}
              </p>

              {despesa.observacoes ? (
                <p className="mt-1 text-xs text-outline">{despesa.observacoes}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {/* Saída de dinheiro é vermelha. Cancelada perde a força:
                  o valor não saiu nem vai sair. */}
              <span
                className={cn(
                  "tabular text-base font-semibold",
                  despesa.situacao === "cancelada"
                    ? "text-outline line-through"
                    : "text-negativo",
                )}
              >
                − {formatarMoeda(despesa.valor)}
              </span>

              <Link
                href={`/financeiro/despesas/${despesa.id}/editar`}
                className="inline-flex h-8 items-center rounded-[var(--radius-cartao)] border border-card-border px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                Editar
              </Link>

              {despesa.situacao === "pendente" ? (
                <form action={mudarSituacaoDespesa}>
                  <input type="hidden" name="id" value={despesa.id} />
                  <input type="hidden" name="acao" value="cancelar" />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-negativo"
                  >
                    <Ban aria-hidden="true" size={13} strokeWidth={1.75} />
                    Cancelar
                  </button>
                </form>
              ) : (
                <form action={mudarSituacaoDespesa}>
                  <input type="hidden" name="id" value={despesa.id} />
                  <input type="hidden" name="acao" value="reabrir" />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                  >
                    <RotateCcw aria-hidden="true" size={13} strokeWidth={1.75} />
                    Reabrir
                  </button>
                </form>
              )}
            </div>
          </div>

          {despesa.situacao === "pendente" ? (
            <div className="border-t border-card-border pt-3">
              <PagarDespesa despesaId={despesa.id} dataPadrao={dataPadrao} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
