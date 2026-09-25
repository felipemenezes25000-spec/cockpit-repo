"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type Aba = { href: string; rotulo: string; ativa: boolean; contagem?: number };

export function NavegacaoEmAbas({ rotulo, abas, className }: { rotulo: string; abas: Aba[]; className?: string }) {
  const faixa = useRef<HTMLDivElement>(null);
  const atual = abas.find((aba) => aba.ativa)?.href;

  useEffect(() => {
    const caixa = faixa.current;
    const ativa = caixa?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!caixa || !ativa) return;
    const centro = ativa.offsetLeft + ativa.offsetWidth / 2 - caixa.clientWidth / 2;
    caixa.scrollLeft = Math.max(0, centro);
  }, [atual]);

  return (
    <nav aria-label={rotulo} className={cn("relative rounded-[var(--radius-painel)] border border-card-border bg-surface p-1.5 shadow-[0_12px_28px_-26px_rgba(8,41,76,.38)]", className)}>
      <div ref={faixa} className="sem-barra-de-rolagem rolagem-esmaecida-x relative snap-x snap-mandatory scroll-px-1 overflow-x-auto">
        <ul className="flex min-w-max gap-1">
          {abas.map((aba) => (
            <li key={aba.href} className="snap-start">
              <Link
                href={aba.href}
                aria-current={aba.ativa ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-controle)] px-3.5 text-sm transition-[background-color,color,box-shadow,transform] duration-150",
                  aba.ativa
                    ? "bg-selecao font-semibold text-primary shadow-[inset_0_0_0_1px_var(--color-primary-fixed-dim)]"
                    : "font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
                )}
              >
                {aba.rotulo}
                {aba.contagem !== undefined && aba.contagem > 0 ? (
                  <span className={cn(
                    "tabular rounded-full px-1.5 py-px text-[0.6875rem] font-semibold",
                    aba.ativa ? "bg-primary-container text-on-primary" : "bg-primary-fixed text-primary",
                  )}>
                    {aba.contagem}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
