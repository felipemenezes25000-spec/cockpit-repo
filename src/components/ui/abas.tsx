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
      <div
        ref={faixa}
        className="rolagem-discreta relative overflow-x-auto rounded-[16px] border border-card-border/75 bg-white/46 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),var(--shadow-cartao)] backdrop-blur-sm"
      >
        <ul className="flex min-w-max gap-1">
          {abas.map((aba) => (
            <li key={aba.href}>
              <Link
                href={aba.href}
                aria-current={aba.ativa ? "page" : undefined}
                className={cn(
                  "group relative inline-flex min-h-10 items-center gap-2 overflow-hidden rounded-[11px] border border-transparent px-3.5 text-sm font-medium transition-[transform,background-color,border-color,box-shadow,color] duration-200 active:scale-[0.985]",
                  aba.ativa
                    ? "border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,248,255,0.88))] font-semibold text-primary shadow-[0_1px_2px_rgba(15,35,58,0.05),0_8px_18px_-12px_rgba(8,84,160,0.45)]"
                    : "text-on-surface-variant hover:border-primary/8 hover:bg-white/60 hover:text-primary",
                )}
              >
                {aba.ativa ? (
                  <>
                    <span aria-hidden="true" className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                    <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary-container shadow-[0_0_8px_rgba(10,110,209,0.22)]" />
                    <span aria-hidden="true" className="pointer-events-none absolute -right-5 -top-5 size-14 rounded-full bg-primary-fixed/35 blur-xl" />
                  </>
                ) : null}
                <span className="relative">{aba.rotulo}</span>
                {aba.contagem !== undefined && aba.contagem > 0 ? (
                  <span className={cn(
                    "tabular relative rounded-full border px-1.5 py-px text-[0.67rem] font-semibold",
                    aba.ativa
                      ? "border-primary/10 bg-white/78 text-primary shadow-[var(--shadow-cartao)]"
                      : "border-card-border/70 bg-primary-fixed/55 text-primary",
                  )}>
                    {aba.contagem}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute top-1.5 right-1.5 bottom-1.5 w-9 rounded-r-[13px] bg-linear-to-l from-white/92 to-transparent sm:hidden" />
    </nav>
  );
}
