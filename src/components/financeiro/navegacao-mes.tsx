"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { capitalizar, formatarMesAno } from "@/lib/format";
import type { Periodo } from "@/lib/periodo";

export function hrefDoMes(caminho: string, busca: string, chave: string | null): string {
  const query = new URLSearchParams(busca);
  if (chave) query.set("mes", chave);
  else query.delete("mes");
  const texto = query.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

export function NavegacaoMes({ periodo }: { periodo: Periodo }) {
  const caminho = usePathname() ?? "/financeiro";
  const busca = useSearchParams()?.toString() ?? "";

  const seta =
    "premium-interactive flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border/80 bg-surface/75 text-on-surface-variant shadow-[var(--shadow-cartao)] hover:border-primary-fixed-dim hover:text-primary";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex w-full items-center gap-2.5 rounded-[var(--radius-painel)] border border-card-border/70 bg-surface-container-low/48 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] sm:w-auto">
        <Link href={hrefDoMes(caminho, busca, periodo.chaveAnterior)} aria-label="Mês anterior" className={seta}>
          <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} />
        </Link>

        <span className="min-w-0 flex-1 px-2 text-center sm:min-w-44 sm:flex-none">
          <span className="rotulo block text-[0.62rem] text-outline">Período</span>
          <span className="mt-1 block text-sm font-semibold tracking-[-0.01em] text-on-surface">
            {capitalizar(formatarMesAno(periodo.de))}
          </span>
        </span>

        <Link href={hrefDoMes(caminho, busca, periodo.chaveProxima)} aria-label="Mês seguinte" className={seta}>
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75} />
        </Link>
      </div>

      {!periodo.ehMesAtual ? (
        <Link
          href={hrefDoMes(caminho, busca, null)}
          className="premium-interactive inline-flex h-10 items-center rounded-[var(--radius-controle)] border border-primary-fixed-dim/60 bg-primary-fixed/35 px-3.5 text-sm font-semibold text-primary hover:bg-primary-fixed/60"
        >
          Mês atual
        </Link>
      ) : null}
    </div>
  );
}
