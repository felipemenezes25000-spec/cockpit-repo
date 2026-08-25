import { ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { ChipRecebimento, MarcaTaxaManual } from "./chips";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { formatarData, formatarMoeda } from "@/lib/format";
import { ROTULO_FORMA } from "@/lib/venda";
import type { VendaDaLista } from "@/server/consultas/vendas";

export function ListaVendas({ vendas }: { vendas: VendaDaLista[] }) {
  if (vendas.length === 0) {
    return (
      <EstadoVazio
        icone={Receipt}
        titulo="Nenhuma venda neste mês"
        descricao="Registre a primeira venda e o financeiro começa a acompanhar."
        acao={
          <BotaoLink href="/financeiro/vendas/nova" variante="primaria" tamanho="sm">
            Registrar venda
          </BotaoLink>
        }
      />
    );
  }

  return (
    <ul aria-label="Vendas" className="flex flex-col gap-3">
      {vendas.map((venda) => (
        <li
          key={venda.id}
          className="relative flex items-center gap-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)] transition-shadow focus-within:border-primary hover:shadow-[0_4px_15px_rgba(0,0,0,0.03)]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/financeiro/vendas/${venda.id}`}
                className="font-medium text-on-surface outline-none after:absolute after:inset-0 after:content-[''] hover:text-primary"
              >
                {venda.paciente}
              </Link>
              <span className="text-sm text-outline">· {venda.procedimento}</span>
              {venda.situacaoRecebimento ? (
                <ChipRecebimento situacao={venda.situacaoRecebimento} />
              ) : null}
              {venda.taxaManual ? <MarcaTaxaManual /> : null}
              {venda.exemplo ? (
                <span className="rounded-[var(--radius-tag)] border border-dashed border-outline-variant px-1.5 py-0.5 text-[0.6875rem] text-outline">
                  exemplo
                </span>
              ) : null}
            </div>

            <p className="tabular mt-1 text-xs text-outline">
              {formatarData(venda.dataVenda)} · {ROTULO_FORMA[venda.forma]}
              {venda.parcelas > 1 ? ` ${venda.parcelas}x` : ""} ·{" "}
              {formatarMoeda(venda.valorFinal)}
              {venda.taxaValor > 0
                ? ` − taxa ${formatarMoeda(venda.taxaValor)} = líquido ${formatarMoeda(venda.valorLiquido)}`
                : ""}
            </p>
          </div>

          <ChevronRight
            aria-hidden="true"
            size={18}
            strokeWidth={1.5}
            className="shrink-0 text-outline-variant"
          />
        </li>
      ))}
    </ul>
  );
}
