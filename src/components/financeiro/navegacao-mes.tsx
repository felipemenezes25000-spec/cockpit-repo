"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatarMesAno } from "@/lib/format";
import { capitalizar } from "@/lib/format";
import type { Periodo } from "@/lib/periodo";

/**
 * Navegação entre meses, com o mês na URL (`?mes=AAAA-MM`) — mesma lógica
 * do dia da Agenda. Serve a todas as telas do financeiro: cada uma passa o
 * próprio caminho.
 */
export function NavegacaoMes({ periodo }: { periodo: Periodo }) {
  const caminho = usePathname() ?? "/financeiro";

  const seta =
    "flex size-9 items-center justify-center rounded-[var(--radius-cartao)] border border-card-border bg-surface text-on-surface-variant transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={`${caminho}?mes=${periodo.chaveAnterior}`}
        aria-label="Mês anterior"
        className={seta}
      >
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} />
      </Link>

      <span className="min-w-40 text-center text-sm font-medium text-on-surface">
        {capitalizar(formatarMesAno(periodo.de))}
      </span>

      <Link
        href={`${caminho}?mes=${periodo.chaveProxima}`}
        aria-label="Mês seguinte"
        className={seta}
      >
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75} />
      </Link>

      {!periodo.ehMesAtual ? (
        <Link
          href={caminho}
          className="inline-flex h-9 items-center rounded-[var(--radius-cartao)] px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
        >
          Mês atual
        </Link>
      ) : null}
    </div>
  );
}
