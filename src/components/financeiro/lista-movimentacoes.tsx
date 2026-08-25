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

const ESTILO: Record<TipoMovimentacao, { icone: LucideIcon; rotulo: string; classes: string }> = {
  venda: { icone: Receipt, rotulo: "Venda", classes: "bg-informativo-fundo text-informativo-texto" },
  recebimento: { icone: ArrowUpRight, rotulo: "Entrada", classes: "bg-positivo-fundo text-positivo" },
  despesa: { icone: ArrowDownRight, rotulo: "Saída", classes: "bg-surface-container text-on-surface-variant" },
  ajuste: { icone: Scale, rotulo: "Ajuste", classes: "bg-atencao-fundo text-atencao" },
};

/**
 * O extrato do período. Venda aparece sem sinal — é o fato gerador; o
 * dinheiro em si entra pela linha de recebimento.
 */
export function ListaMovimentacoes({ itens }: { itens: Movimentacao[] }) {
  if (itens.length === 0) {
    return (
      <EstadoVazio
        icone={History}
        titulo="Nenhuma movimentação neste mês"
        descricao="Vendas, recebimentos, despesas pagas e ajustes aparecem aqui em ordem."
      />
    );
  }

  return (
    <ul aria-label="Movimentações" className="flex flex-col">
      {itens.map((item, i) => {
        const estilo = ESTILO[item.tipo];
        const Icone = estilo.icone;
        const ehCaixa = item.tipo !== "venda";

        const conteudo = (
          <>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-cartao)]",
                estilo.classes,
              )}
            >
              <Icone aria-hidden="true" size={15} strokeWidth={1.75} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-on-surface">
                {item.titulo}
              </span>
              <span className="block truncate text-xs text-outline">
                {formatarData(item.data)}
                {item.detalhe ? ` · ${item.detalhe}` : ""}
                {item.forma ? ` · ${ROTULO_FORMA[item.forma]}` : ""}
              </span>
            </span>

            <span
              className={cn(
                "tabular shrink-0 text-sm",
                !ehCaixa && "text-outline",
                ehCaixa && item.valor >= 0 && "font-medium text-positivo",
                ehCaixa && item.valor < 0 && "font-medium text-on-surface-variant",
              )}
            >
              {ehCaixa && item.valor > 0 ? "+ " : ""}
              {item.valor < 0 ? "− " : ""}
              {formatarMoeda(Math.abs(item.valor))}
            </span>
          </>
        );

        const classes =
          "flex items-center gap-3 border-b border-card-border px-1 py-3 last:border-b-0";

        return (
          <li key={`${item.tipo}-${item.data.getTime()}-${i}`}>
            {item.href ? (
              <Link href={item.href} className={cn(classes, "transition-colors hover:bg-surface-container-low")}>
                {conteudo}
              </Link>
            ) : (
              <div className={classes}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
