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
    "group flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-card-border/80 bg-white/72 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.92),var(--shadow-cartao)] transition-[transform,background-color,border-color,box-shadow,color] duration-150 hover:-translate-y-px hover:border-primary/20 hover:bg-white hover:text-primary hover:shadow-[var(--shadow-realce)] active:translate-y-px active:scale-[0.97]";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="premium-panel relative flex w-full items-center gap-2.5 overflow-hidden rounded-[16px] border p-2 shadow-[var(--shadow-cartao)] sm:w-auto">
        <span aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/2 size-28 -translate-x-1/2 rounded-full bg-primary-fixed/28 blur-3xl" />
        <Link href={hrefDoMes(caminho, busca, periodo.chaveAnterior)} aria-label="Mês anterior" className={seta}>
          <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
        </Link>

        <span className="relative min-w-0 flex-1 px-2 text-center sm:min-w-44 sm:flex-none">
          <span className="rotulo block text-[0.62rem] text-outline">Período financeiro</span>
          <span className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold tracking-[-0.015em] text-on-surface">
            {periodo.ehMesAtual ? <span aria-hidden="true" className="size-1.5 rounded-full bg-positivo shadow-[0_0_8px_rgba(14,118,57,0.2)]" /> : null}
            {capitalizar(formatarMesAno(periodo.de))}
          </span>
        </span>

        <Link href={hrefDoMes(caminho, busca, periodo.chaveProxima)} aria-label="Mês seguinte" className={seta}>
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {!periodo.ehMesAtual ? (
        <Link
          href={hrefDoMes(caminho, busca, null)}
          className="premium-interactive inline-flex h-10 items-center gap-2 rounded-[12px] border border-primary/10 bg-primary-fixed/38 px-3.5 text-sm font-semibold text-primary shadow-[var(--shadow-cartao)] hover:bg-primary-fixed/62"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary-container" />
          Mês atual
        </Link>
      ) : (
        <span className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-positivo-borda/50 bg-positivo-fundo/52 px-3.5 text-xs font-semibold text-positivo shadow-[var(--shadow-cartao)]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-positivo" />
          Período atual
        </span>
      )}
    </div>
  );
}
