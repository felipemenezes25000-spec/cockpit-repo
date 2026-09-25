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

const ESTILO: Record<TipoMovimentacao, { icone: LucideIcon; rotulo: string; classes: string; trilha: string; barra: string }> = {
  venda: { icone: Receipt, rotulo: "Venda", classes: "bg-informativo-fundo text-informativo-texto", trilha: "bg-informativo-borda", barra: "bg-informativo-texto" },
  recebimento: { icone: ArrowUpRight, rotulo: "Entrada", classes: "bg-positivo-fundo text-positivo", trilha: "bg-positivo-borda", barra: "bg-positivo" },
  despesa: { icone: ArrowDownRight, rotulo: "Saída", classes: "bg-negativo-fundo text-negativo", trilha: "bg-negativo-borda", barra: "bg-negativo" },
  ajuste: { icone: Scale, rotulo: "Ajuste", classes: "bg-atencao-fundo text-atencao", trilha: "bg-atencao-borda", barra: "bg-atencao" },
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
    <ol aria-label="Movimentações" className="relative flex flex-col gap-3 before:absolute before:top-6 before:bottom-6 before:left-[1.45rem] before:w-px before:bg-gradient-to-b before:from-primary-fixed-dim before:via-card-border before:to-transparent sm:before:left-[1.57rem]">
      {itens.map((item, i) => {
        const estilo = ESTILO[item.tipo];
        const Icone = estilo.icone;
        const ehCaixa = item.tipo !== "venda";

        const conteudo = (
          <>
            <span aria-hidden="true" className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r-full opacity-80", estilo.barra)} />

            <span className={cn("relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-card-border shadow-[0_10px_22px_-17px_rgba(7,57,112,.65)] sm:size-12", estilo.classes)}>
              <Icone aria-hidden="true" size={18} strokeWidth={1.8} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 text-sm font-bold tracking-[-0.01em] [overflow-wrap:anywhere] text-on-surface sm:text-[0.92rem] sm:truncate">{item.titulo}</span>
                <span className={cn("size-1.5 shrink-0 rounded-full", estilo.trilha)} aria-hidden="true" />
                <span className="text-[0.66rem] font-semibold tracking-[0.07em] text-outline uppercase">{estilo.rotulo}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-5 [overflow-wrap:anywhere] text-outline sm:truncate">
                {formatarData(item.data)}
                {item.detalhe ? ` · ${item.detalhe}` : ""}
                {item.forma ? ` · ${ROTULO_FORMA[item.forma]}` : ""}
              </span>
            </span>

            <span className="flex shrink-0 flex-col items-end gap-1.5 self-center">
              <span
                className={cn(
                  "tabular rounded-[var(--radius-controle)] border px-2.5 py-1.5 text-sm font-bold tracking-[-0.015em] sm:px-3",
                  !ehCaixa && "border-card-border bg-surface-container-low text-outline",
                  ehCaixa && item.valor >= 0 && "border-positivo-borda bg-positivo-fundo text-positivo",
                  ehCaixa && item.valor < 0 && "border-negativo-borda bg-negativo-fundo text-negativo",
                )}
              >
                {ehCaixa && item.valor > 0 ? "+ " : ""}
                {item.valor < 0 ? "− " : ""}
                {formatarMoeda(Math.abs(item.valor))}
              </span>
              {item.href ? <span className="hidden text-[0.65rem] font-semibold text-primary sm:block">Abrir registro</span> : null}
            </span>

            {item.href ? (
              <span aria-hidden="true" className="hidden size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline transition-[transform,border-color,background-color,color] group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary md:flex">
                <ChevronRight size={14} />
              </span>
            ) : null}
          </>
        );

        const classes = "premium-interactive group relative flex items-center gap-3 overflow-hidden rounded-[calc(var(--radius-cartao)+3px)] border border-card-border bg-surface px-3.5 py-3.5 pl-4 sm:px-4 sm:py-4 sm:pl-5";

        return (
          <li key={`${item.tipo}-${item.data.getTime()}-${i}`} style={{ animationDelay: `${Math.min(i * 42, 260)}ms` }} className="dashboard-stagger">
            {item.href ? <Link href={item.href} className={classes}>{conteudo}</Link> : <div className={classes}>{conteudo}</div>}
          </li>
        );
      })}
    </ol>
  );
}
