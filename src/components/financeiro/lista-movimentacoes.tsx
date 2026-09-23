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
  despesa: { icone: ArrowDownRight, rotulo: "Saída", classes: "bg-negativo-fundo text-negativo" },
  ajuste: { icone: Scale, rotulo: "Ajuste", classes: "bg-atencao-fundo text-atencao" },
};

/**
 * O extrato do período. Venda aparece sem sinal — é o fato gerador; o
 * dinheiro em si entra pela linha de recebimento.
 */
export function ListaMovimentacoes({
  itens,
  filtrada = false,
}: {
  itens: Movimentacao[];
  /** A lista está vazia por causa do filtro de tipo, não por falta de movimento. */
  filtrada?: boolean;
}) {
  if (itens.length === 0) {
    return filtrada ? (
      <EstadoVazio
        icone={History}
        titulo="Nada com estes filtros"
        descricao="Afrouxe o filtro de tipo ou troque o mês para encontrar a movimentação."
      />
    ) : (
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
              {/* Quebra no celular em vez de truncar: a 320 px sobravam uns 90 px
                  e "Venda — Car…" não dizia de quem nem o quê. */}
              <span className="block text-sm font-medium break-words text-on-surface sm:truncate">
                {item.titulo}
              </span>
              <span className="block text-xs break-words text-outline sm:truncate">
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
                // Dinheiro saindo é vermelho — despesa paga e ajuste negativo.
                ehCaixa && item.valor < 0 && "font-medium text-negativo",
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
