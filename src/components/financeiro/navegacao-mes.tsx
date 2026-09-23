"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { formatarMesAno } from "@/lib/format";
import { capitalizar } from "@/lib/format";
import type { Periodo } from "@/lib/periodo";

/**
 * O link para outro mês mantendo os filtros da tela (situação, forma, busca).
 * `chave` nula volta ao mês atual, que é o padrão sem `?mes=`.
 */
export function hrefDoMes(caminho: string, busca: string, chave: string | null): string {
  const query = new URLSearchParams(busca);
  if (chave) query.set("mes", chave);
  else query.delete("mes");
  const texto = query.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

/**
 * Navegação entre meses, com o mês na URL (`?mes=AAAA-MM`) — mesma lógica
 * do dia da Agenda. Serve a todas as telas do financeiro: cada uma passa o
 * próprio caminho.
 */
export function NavegacaoMes({ periodo }: { periodo: Periodo }) {
  const caminho = usePathname() ?? "/financeiro";
  // Trocar de mês não zera os filtros: o estado vazio "Nada com estes
  // filtros" sugere trocar o mês, e antes a troca levava os filtros junto.
  const busca = useSearchParams()?.toString() ?? "";

  const seta =
    "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] border border-card-border bg-surface text-on-surface-variant transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Setas e mês num grupo que não quebra: a 320 px a seta "›" descia
          sozinha para a linha de baixo. "Mês atual" é que desce, se faltar
          espaço. */}
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <Link
          href={hrefDoMes(caminho, busca, periodo.chaveAnterior)}
          aria-label="Mês anterior"
          className={seta}
        >
          <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} />
        </Link>

        <span className="min-w-0 flex-1 text-center text-sm font-medium text-on-surface sm:min-w-40 sm:flex-none">
          {capitalizar(formatarMesAno(periodo.de))}
        </span>

        <Link
          href={hrefDoMes(caminho, busca, periodo.chaveProxima)}
          aria-label="Mês seguinte"
          className={seta}
        >
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75} />
        </Link>
      </div>

      {!periodo.ehMesAtual ? (
        <Link
          href={hrefDoMes(caminho, busca, null)}
          className="inline-flex h-9 items-center rounded-[var(--radius-cartao)] px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
        >
          Mês atual
        </Link>
      ) : null}
    </div>
  );
}
