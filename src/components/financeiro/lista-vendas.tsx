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
    <ul aria-label="Vendas" className="grid gap-3 lg:grid-cols-2">
      {vendas.map((venda) => (
        <li
          key={venda.id}
          // O link cobre o cartão (after:inset-0) e não tem contorno próprio:
          // o anel de foco de teclado fica no cartão (has-[:focus-visible]).
          className="premium-interactive group relative isolate flex min-h-40 flex-col overflow-hidden rounded-[var(--radius-painel)] border border-card-border/75 bg-surface/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)] focus-within:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
        >
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 -z-10 size-36 rounded-full bg-primary-fixed/28 blur-2xl transition-transform duration-300 group-hover:scale-125" />

          <div className="flex items-start justify-between gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary-fixed-dim/50 bg-primary-fixed/42 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.65} />
            </span>
            <div className="flex flex-wrap justify-end gap-1.5">
              <ChipRecebimento situacao={venda.situacaoRecebimento ?? "cancelado"} />
              {venda.taxaManual ? <MarcaTaxaManual /> : null}
              {venda.exemplo ? <SeloHero className="min-h-7 px-2 py-0 text-[0.65rem]">Exemplo</SeloHero> : null}
            </div>
          </div>

          <div className="mt-4 min-w-0 flex-1">
            <Link
              href={`/financeiro/vendas/${venda.id}`}
              className="inline-flex min-h-6 items-center font-semibold text-on-surface outline-none after:absolute after:inset-0 after:content-[''] hover:text-primary"
            >
              {venda.paciente}
            </Link>
            <p className="mt-1 text-sm leading-5 text-on-surface-variant">{venda.procedimento}</p>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="tabular text-xl font-semibold tracking-[-0.025em] text-on-surface">{formatarMoeda(venda.valorFinal)}</p>
                {venda.taxaValor > 0 ? (
                  <p className="tabular mt-1 text-xs text-outline">líquido {formatarMoeda(venda.valorLiquido)} · taxa {formatarMoeda(venda.taxaValor)}</p>
                ) : (
                  <p className="tabular mt-1 text-xs text-outline">líquido {formatarMoeda(venda.valorLiquido)}</p>
                )}
              </div>
              <p className="tabular text-right text-xs leading-5 text-outline">
                {formatarData(venda.dataVenda)}<br />
                {ROTULO_FORMA[venda.forma]}{venda.parcelas > 1 ? ` · ${venda.parcelas}x` : ""}
              </p>
            </div>
          </div>

          <ChevronRight aria-hidden="true" size={17} strokeWidth={1.6} className="absolute right-4 bottom-4 text-outline-variant transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
        </li>
      ))}
    </ul>
  );
}
