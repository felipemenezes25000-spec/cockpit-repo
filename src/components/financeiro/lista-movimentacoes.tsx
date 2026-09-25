import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  History,
  Receipt,
  Scale,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { EstadoVazio } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatarData, formatarMoeda } from "@/lib/format";
import { ROTULO_FORMA } from "@/lib/venda";
import type { Movimentacao, TipoMovimentacao } from "@/server/consultas/painel-financeiro";

const ESTILO: Record<TipoMovimentacao, { icone: LucideIcon; rotulo: string; classes: string; trilha: string }> = {
  venda: { icone: Receipt, rotulo: "Venda", classes: "bg-informativo-fundo text-informativo-texto", trilha: "bg-informativo-borda" },
  recebimento: { icone: ArrowUpRight, rotulo: "Entrada", classes: "bg-positivo-fundo text-positivo", trilha: "bg-positivo-borda" },
  despesa: { icone: ArrowDownRight, rotulo: "Saída", classes: "bg-negativo-fundo text-negativo", trilha: "bg-negativo-borda" },
  ajuste: { icone: Scale, rotulo: "Ajuste", classes: "bg-atencao-fundo text-atencao", trilha: "bg-atencao-borda" },
};

export function ListaMovimentacoes({
  itens,
  filtrada = false,
}: {
  itens: Movimentacao[];
  filtrada?: boolean;
}) {
  if (itens.length === 0) {
    return filtrada ? (
      <EstadoVazio icone={History} titulo="Nada com estes filtros" descricao="Afrouxe o filtro de tipo ou troque o mês para encontrar a movimentação." />
    ) : (
      <EstadoVazio icone={History} titulo="Nenhuma movimentação neste mês" descricao="Vendas, recebimentos, despesas pagas e ajustes aparecem aqui em ordem." />
    );
  }

  return (
    <ol aria-label="Movimentações" className="relative flex flex-col gap-3 before:absolute before:top-5 before:bottom-5 before:left-[1.32rem] before:w-px before:bg-gradient-to-b before:from-primary-fixed-dim before:via-card-border before:to-transparent">
      {itens.map((item, i) => {
        const estilo = ESTILO[item.tipo];
        const Icone = estilo.icone;
        const ehCaixa = item.tipo !== "venda";

        const conteudo = (
          <>
            <span className={cn("relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border shadow-[0_8px_18px_-15px_rgba(7,57,112,.55)]", estilo.classes)}>
              <Icone aria-hidden="true" size={17} strokeWidth={1.8} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 text-sm font-bold tracking-[-0.01em] [overflow-wrap:anywhere] text-on-surface sm:truncate">{item.titulo}</span>
                <span className={cn("size-1.5 shrink-0 rounded-full", estilo.trilha)} aria-hidden="true" />
                <span className="text-[0.68rem] font-semibold tracking-wide text-outline uppercase">{estilo.rotulo}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-5 [overflow-wrap:anywhere] text-outline sm:truncate">
                {formatarData(item.data)}
                {item.detalhe ? ` · ${item.detalhe}` : ""}
                {item.forma ? ` · ${ROTULO_FORMA[item.forma]}` : ""}
              </span>
            </span>

            <span
              className={cn(
                "tabular shrink-0 self-center rounded-[var(--radius-controle)] border px-3 py-1.5 text-sm font-bold tracking-[-0.015em]",
                !ehCaixa && "border-card-border bg-surface-container-low text-outline",
                ehCaixa && item.valor >= 0 && "border-positivo-borda bg-positivo-fundo text-positivo",
                ehCaixa && item.valor < 0 && "border-negativo-borda bg-negativo-fundo text-negativo",
              )}
            >
              {ehCaixa && item.valor > 0 ? "+ " : ""}
              {item.valor < 0 ? "− " : ""}
              {formatarMoeda(Math.abs(item.valor))}
            </span>

            {item.href ? (
              <span aria-hidden="true" className="hidden size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline transition-[transform,border-color,background-color,color] group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary sm:flex">
                <ChevronRight size={14} />
              </span>
            ) : null}
          </>
        );

        const classes = "premium-interactive group relative flex items-center gap-3 rounded-[calc(var(--radius-cartao)+2px)] border border-card-border bg-surface px-3.5 py-3.5 sm:px-4";

        return (
          <li key={`${item.tipo}-${item.data.getTime()}-${i}`}>
            {item.href ? <Link href={item.href} className={classes}>{conteudo}</Link> : <div className={classes}>{conteudo}</div>}
          </li>
        );
      })}
    </ol>
  );
}
