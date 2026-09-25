"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MENU, itemAtivo } from "@/lib/nav";

const SECOES = [
  { rotulo: "Operação", itens: MENU.slice(0, 4), inicio: 0 },
  { rotulo: "Gestão", itens: MENU.slice(4, 7), inicio: 4 },
  { rotulo: "Sistema", itens: MENU.slice(7), inicio: 7 },
] as const;

/**
 * A lista de módulos da gaveta, em três seções. Ao abrir a gaveta, os itens
 * entram em cascata (`--i` é a posição do item na lista inteira).
 */
export function MenuNavegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho ?? "/");

  return (
    <nav aria-label="Módulos do sistema">
      <div className="flex flex-col gap-5">
        {SECOES.map((secao) => (
          <section key={secao.rotulo} aria-label={secao.rotulo}>
            <p className="rotulo mb-2 px-3 text-outline">{secao.rotulo}</p>
            <ul className="flex flex-col gap-1">
              {secao.itens.map((item, indice) => {
                const Icone = item.icone;
                const estaAtivo = ativo?.href === item.href;
                return (
                  <li key={item.href} className="item-gaveta" style={{ "--i": secao.inicio + indice } as CSSProperties}>
                    <Link
                      href={item.href}
                      onClick={aoNavegar}
                      aria-current={estaAtivo ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-12 items-center gap-3 rounded-[var(--radius-cartao)] border px-3 py-2 text-sm transition-[transform,background-color,border-color,color,box-shadow] duration-150",
                        estaAtivo
                          ? "border-primary-fixed-dim bg-selecao font-semibold text-primary shadow-[0_10px_22px_-18px_rgba(8,84,160,.45)]"
                          : "border-transparent text-on-surface-variant hover:-translate-y-0.5 hover:border-card-border hover:bg-surface hover:text-primary hover:shadow-[0_10px_22px_-20px_rgba(8,41,76,.36)]",
                      )}
                    >
                      {estaAtivo ? <span aria-hidden="true" className="traco-ativo absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary-container" /> : null}
                      <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)]", estaAtivo ? "bg-primary-fixed text-primary" : "bg-surface-container-low text-on-surface-variant")}>
                        <Icone size={18} strokeWidth={estaAtivo ? 2 : 1.7} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                      {item.emConstrucao ? (
                        <span className="shrink-0 rounded-[var(--radius-tag)] border border-card-border bg-surface px-1.5 py-px text-[0.66rem] font-medium text-outline">em breve</span>
                      ) : null}
                    </Link>
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
