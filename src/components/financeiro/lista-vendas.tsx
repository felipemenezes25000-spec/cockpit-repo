import { ChevronRight, Receipt, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { ChipRecebimento, MarcaTaxaManual } from "./chips";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SeloHero } from "@/components/ui/page-hero";
import { formatarData, formatarMoeda } from "@/lib/format";
import { ROTULO_FORMA } from "@/lib/venda";
import type { VendaDaLista } from "@/server/consultas/vendas";

export function ListaVendas({
  vendas,
  filtrada = false,
}: {
  vendas: VendaDaLista[];
  filtrada?: boolean;
}) {
  if (vendas.length === 0) {
    return filtrada ? (
      <EstadoVazio icone={Receipt} titulo="Nada com estes filtros" descricao="Afrouxe os filtros ou troque o mês para encontrar a venda." />
    ) : (
      <EstadoVazio
        icone={Receipt}
        titulo="Nenhuma venda neste mês"
        descricao="Registre a primeira venda e o financeiro começa a acompanhar."
        acao={<BotaoLink href="/financeiro/vendas/nova" variante="primaria" tamanho="sm">Registrar venda</BotaoLink>}
      />
    );
  }

  return (
    <ul aria-label="Vendas" className="grid min-w-0 gap-3 lg:grid-cols-2">
      {vendas.map((venda) => (
        <li
          key={venda.id}
          // O link cobre o cartão (after:inset-0) e não tem contorno próprio:
          // o anel de foco de teclado fica no cartão (has-[:focus-visible]).
          className="premium-interactive group relative isolate flex min-h-40 min-w-0 flex-col overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface p-4 focus-within:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-selecao text-primary">
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.65} />
            </span>
            <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
              <ChipRecebimento situacao={venda.situacaoRecebimento ?? "cancelado"} />
              {venda.taxaManual ? <MarcaTaxaManual /> : null}
              {venda.exemplo ? <SeloHero className="min-h-7 px-2 py-0 text-[0.65rem]">Exemplo</SeloHero> : null}
            </div>
          </div>

          <div className="mt-4 min-w-0 flex-1">
            <Link
              href={`/financeiro/vendas/${venda.id}`}
              className="inline-flex min-h-6 max-w-full items-center break-words font-semibold text-on-surface outline-none after:absolute after:inset-0 after:content-[''] hover:text-primary"
            >
              {venda.paciente}
            </Link>
            <p className="mt-1 min-w-0 break-words text-sm leading-5 text-on-surface-variant">{venda.procedimento}</p>

            <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="tabular break-words text-xl font-semibold tracking-[-0.025em] text-on-surface">{formatarMoeda(venda.valorFinal)}</p>
                {venda.taxaValor > 0 ? (
                  <p className="tabular mt-1 break-words text-xs leading-5 text-outline">líquido {formatarMoeda(venda.valorLiquido)} · taxa {formatarMoeda(venda.taxaValor)}</p>
                ) : (
                  <p className="tabular mt-1 break-words text-xs leading-5 text-outline">líquido {formatarMoeda(venda.valorLiquido)}</p>
                )}
              </div>
              <p className="tabular min-w-0 break-words text-right text-xs leading-5 text-outline">
                {formatarData(venda.dataVenda)}<br />
                {ROTULO_FORMA[venda.forma]}{venda.parcelas > 1 ? ` · ${venda.parcelas}x` : ""}
              </p>
            </div>
          </div>

          <div aria-hidden="true" className="mt-3 flex justify-end border-t border-card-border pt-2.5">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius-controle)] border border-transparent text-outline transition-[transform,color,border-color,background-color] duration-150 group-hover:translate-x-0.5 group-hover:border-primary-fixed group-hover:bg-selecao group-hover:text-primary">
              <ChevronRight size={16} strokeWidth={1.7} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
