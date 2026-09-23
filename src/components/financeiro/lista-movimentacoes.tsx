import {
  ArrowDownRight,
  ArrowUpRight,
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
    <ol aria-label="Movimentações" className="relative flex flex-col gap-2.5 before:absolute before:top-5 before:bottom-5 before:left-[1.18rem] before:w-px before:bg-card-border">
      {itens.map((item, i) => {
        const estilo = ESTILO[item.tipo];
        const Icone = estilo.icone;
        const ehCaixa = item.tipo !== "venda";

        const conteudo = (
          <>
            <span className={cn("relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/70 shadow-[var(--shadow-cartao)]", estilo.classes)}>
              <Icone aria-hidden="true" size={16} strokeWidth={1.75} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold break-words text-on-surface sm:truncate">{item.titulo}</span>
                <span className={cn("size-1.5 shrink-0 rounded-full", estilo.trilha)} aria-hidden="true" />
                <span className="text-[0.68rem] font-semibold tracking-wide text-outline uppercase">{estilo.rotulo}</span>
              </span>
              <span className="mt-1 block text-xs leading-5 break-words text-outline sm:truncate">
                {formatarData(item.data)}
                {item.detalhe ? ` · ${item.detalhe}` : ""}
                {item.forma ? ` · ${ROTULO_FORMA[item.forma]}` : ""}
              </span>
            </span>

            <span
              className={cn(
                "tabular shrink-0 self-center rounded-lg px-2.5 py-1.5 text-sm font-semibold",
                !ehCaixa && "bg-surface-container-low text-outline",
                ehCaixa && item.valor >= 0 && "bg-positivo-fundo/75 text-positivo",
                ehCaixa && item.valor < 0 && "bg-negativo-fundo/75 text-negativo",
              )}
            >
              {ehCaixa && item.valor > 0 ? "+ " : ""}
              {item.valor < 0 ? "− " : ""}
              {formatarMoeda(Math.abs(item.valor))}
            </span>
          </>
        );

        const classes = "premium-interactive relative flex items-center gap-3 rounded-[var(--radius-cartao)] border border-card-border/65 bg-surface/60 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]";

        return (
          <li key={`${item.tipo}-${item.data.getTime()}-${i}`}>
            {item.href ? <Link href={item.href} className={classes}>{conteudo}</Link> : <div className={classes}>{conteudo}</div>}
          </li>
        );
      })}
    </ol>
  );
}
