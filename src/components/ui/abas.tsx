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
    <nav aria-label={rotulo} className={cn("relative", className)}>
      <div ref={faixa} className="rolagem-discreta relative overflow-x-auto rounded-[14px] border border-card-border/80 bg-white/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <ul className="flex min-w-max gap-1">
          {abas.map((aba) => (
            <li key={aba.href}>
              <Link href={aba.href} aria-current={aba.ativa ? "page" : undefined} className={cn("relative inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3.5 text-sm font-medium transition-[transform,background-color,box-shadow,color] duration-200 active:scale-[0.985]", aba.ativa ? "bg-white text-primary shadow-[0_1px_2px_rgba(15,35,58,0.06),0_6px_16px_-10px_rgba(8,84,160,0.4)]" : "text-on-surface-variant hover:bg-white/60 hover:text-primary")}>
                {aba.ativa ? <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary-container" /> : null}
                {aba.rotulo}
                {aba.contagem !== undefined && aba.contagem > 0 ? <span className="tabular rounded-full bg-primary-fixed/80 px-1.5 py-px text-[0.68rem] font-semibold text-primary">{aba.contagem}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 bottom-1 w-8 rounded-r-[12px] bg-linear-to-l from-white/90 to-transparent sm:hidden" />
    </nav>
  );
}
