"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MENU, itemAtivo } from "@/lib/nav";

export function MenuNavegacao({ recolhido, aoNavegar }: { recolhido: boolean; aoNavegar?: () => void }) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho ?? "/");

  return (
    <nav aria-label="Módulos do sistema" className="px-1">
      <ul className="flex flex-col gap-1.5">
        {MENU.map((item) => {
          const Icone = item.icone;
          const estaAtivo = ativo?.href === item.href;
          return (
            <li key={item.href}>
              <Link href={item.href} onClick={aoNavegar} aria-current={estaAtivo ? "page" : undefined} title={recolhido ? `${item.rotulo}${item.emConstrucao ? " (em breve)" : ""}` : undefined} className={cn("group relative flex min-h-11 items-center overflow-hidden rounded-[13px] border border-transparent py-2.5 transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out active:scale-[0.985]", recolhido ? "justify-center px-0" : "px-3.5", estaAtivo ? "border-primary/10 bg-[linear-gradient(135deg,rgba(209,232,255,0.8),rgba(255,255,255,0.76))] font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_7px_20px_-15px_rgba(8,84,160,0.85)]" : "text-on-surface-variant hover:-translate-y-px hover:border-primary/10 hover:bg-white/60 hover:text-primary")}>
                {estaAtivo ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary-container shadow-[0_0_12px_rgba(10,110,209,0.35)]" /> : null}
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-[transform,background-color] duration-200 group-hover:scale-[1.035]", estaAtivo ? "bg-white/75 shadow-[var(--shadow-cartao)]" : "bg-transparent", !recolhido && "mr-2.5")}>
                  <Icone aria-hidden="true" size={20} strokeWidth={estaAtivo ? 1.9 : 1.55} />
                </span>
                {recolhido ? <span className="sr-only">{item.rotulo}{item.emConstrucao ? " (em breve)" : ""}</span> : <span className="flex min-w-0 flex-1 items-center justify-between gap-2"><span className="truncate text-sm leading-snug">{item.rotulo}</span>{item.emConstrucao ? <span className="shrink-0 rounded-[7px] border border-outline-variant/70 bg-white/50 px-1.5 py-0.5 text-[0.64rem] font-medium tracking-wide text-outline">em breve</span> : null}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
