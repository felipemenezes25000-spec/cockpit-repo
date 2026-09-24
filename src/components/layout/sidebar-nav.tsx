"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MENU, itemAtivo } from "@/lib/nav";

const SECOES = [
  { rotulo: "Operação", itens: MENU.slice(0, 4) },
  { rotulo: "Gestão", itens: MENU.slice(4, 7) },
  { rotulo: "Sistema", itens: MENU.slice(7) },
] as const;

export function MenuNavegacao({ recolhido, aoNavegar }: { recolhido: boolean; aoNavegar?: () => void }) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho ?? "/");

  return (
    <nav aria-label="Módulos do sistema" className="overflow-visible px-1">
      <div className="flex flex-col gap-3">
        {SECOES.map((secao, indiceSecao) => (
          <section key={secao.rotulo} aria-label={secao.rotulo}>
            {!recolhido ? (
              <div className="mb-1.5 flex items-center gap-2 px-3.5">
                <span className="text-[0.6rem] font-bold tracking-[0.11em] text-outline/75 uppercase">{secao.rotulo}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-card-border/80 to-transparent" />
              </div>
            ) : indiceSecao > 0 ? (
              <div aria-hidden="true" className="mx-auto mb-2 h-px w-8 bg-card-border/80" />
            ) : null}

            <ul className="flex flex-col gap-1.5">
              {secao.itens.map((item) => {
                const Icone = item.icone;
                const estaAtivo = ativo?.href === item.href;
                return (
                  <li key={item.href} className="group/item relative">
                    <Link
                      href={item.href}
                      onClick={aoNavegar}
                      aria-current={estaAtivo ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-11 items-center overflow-hidden rounded-[13px] border border-transparent py-2.5 transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out active:scale-[0.985]",
                        recolhido ? "justify-center px-0" : "px-3.5",
                        estaAtivo
                          ? "border-primary/10 bg-[linear-gradient(135deg,rgba(209,232,255,0.8),rgba(255,255,255,0.76))] font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_7px_20px_-15px_rgba(8,84,160,0.85)]"
                          : "text-on-surface-variant hover:-translate-y-px hover:border-primary/10 hover:bg-white/60 hover:text-primary",
                      )}
                    >
                      {estaAtivo ? (
                        <>
                          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary-container shadow-[0_0_12px_rgba(10,110,209,0.35)]" />
                          <span aria-hidden="true" className="pointer-events-none absolute -right-10 top-1/2 size-24 -translate-y-1/2 rounded-full bg-primary-fixed/35 blur-2xl" />
                        </>
                      ) : null}
                      <span className={cn(
                        "relative flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-[transform,background-color,box-shadow] duration-200 group-hover:scale-[1.035]",
                        estaAtivo ? "bg-white/80 shadow-[var(--shadow-cartao)]" : "bg-transparent",
                        !recolhido && "mr-2.5",
                      )}>
                        <Icone aria-hidden="true" size={20} strokeWidth={estaAtivo ? 1.9 : 1.55} />
                      </span>
                      {recolhido ? (
                        <span className="sr-only">{item.rotulo}{item.emConstrucao ? " (em breve)" : ""}</span>
                      ) : (
                        <span className="relative flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate text-sm leading-snug">{item.rotulo}</span>
                          {item.emConstrucao ? (
                            <span className="shrink-0 rounded-[7px] border border-outline-variant/70 bg-white/55 px-1.5 py-0.5 text-[0.64rem] font-medium tracking-wide text-outline">em breve</span>
                          ) : null}
                        </span>
                      )}
                    </Link>

                    {recolhido ? (
                      <span
                        role="tooltip"
                        className="glass-surface pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 translate-x-1 scale-[0.98] whitespace-nowrap rounded-[11px] border border-white/85 px-3 py-2 text-xs font-semibold text-on-surface opacity-0 shadow-[var(--shadow-flutuante)] transition-[opacity,transform] duration-150 group-hover/item:translate-x-0 group-hover/item:scale-100 group-hover/item:opacity-100 group-focus-within/item:translate-x-0 group-focus-within/item:scale-100 group-focus-within/item:opacity-100"
                      >
                        {item.rotulo}
                        {item.emConstrucao ? <span className="ml-2 font-medium text-outline">em breve</span> : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
