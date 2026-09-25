"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MODULOS_DA_BARRA, MODULOS_EM_MAIS, itemAtivo } from "@/lib/nav";

/**
 * Os módulos numa barra no topo, no lugar do menu lateral.
 *
 * No computador largo cada módulo mostra ícone e nome; entre 1280 e 1535 px,
 * só o nome; entre 1024 e 1279 px, só o ícone (o nome fica para o leitor de
 * tela e para a dica). Abaixo de 1024 px quem navega é a gaveta e a barra
 * inferior. Relatórios e Configurações ficam em "Mais".
 */
export function BarraDeModulos({ className }: { className?: string }) {
  const caminho = usePathname() ?? "/";
  const ativo = itemAtivo(caminho);

  return (
    <nav aria-label="Módulos do sistema" className={cn("min-w-0", className)}>
      <ul className="flex items-center gap-0.5">
        {MODULOS_DA_BARRA.map((item) => {
          const Icone = item.icone;
          const atual = ativo?.href === item.href;
          const rotulo = item.rotuloCurto ?? item.rotulo;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                title={rotulo}
                className={cn(
                  "relative flex h-10 items-center gap-2 rounded-[var(--radius-controle)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 xl:px-3",
                  atual
                    ? "bg-primary-fixed font-semibold text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
                )}
              >
                <Icone aria-hidden="true" size={19} strokeWidth={atual ? 2 : 1.7} className="shrink-0 xl:hidden 2xl:block" />
                <span className="sr-only xl:not-sr-only">{rotulo}</span>
                {atual ? <span aria-hidden="true" className="traco-ativo absolute inset-x-2.5 -bottom-[13px] h-[3px] rounded-full bg-primary-container" /> : null}
              </Link>
            </li>
          );
        })}
        <li>
          <MenuMais />
        </li>
      </ul>
    </nav>
  );
}

function MenuMais() {
  const caminho = usePathname() ?? "/";
  const ativo = itemAtivo(caminho);
  const dentro = MODULOS_EM_MAIS.some((item) => item.href === ativo?.href);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) window.requestAnimationFrame(() => gatilho.current?.focus());
  }, []);

  useEffect(() => {
    setAberto(false);
  }, [caminho]);

  useEffect(() => {
    if (!aberto) return;
    const primeiro = caixa.current?.querySelector<HTMLAnchorElement>("a");
    primeiro?.focus();
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar(true);
      }
    }
    function aoClicarFora(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) fechar(false);
    }
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto, fechar]);

  return (
    <div ref={caixa} className="relative">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-controls="menu-mais-modulos"
        className={cn(
          "relative flex h-10 items-center gap-1.5 rounded-[var(--radius-controle)] px-2.5 text-sm font-medium transition-colors duration-150 xl:px-3",
          dentro ? "bg-primary-fixed font-semibold text-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
        )}
      >
        Mais
        <ChevronDown aria-hidden="true" size={15} strokeWidth={1.8} className={cn("transition-transform duration-150", aberto && "rotate-180")} />
        {dentro ? <span aria-hidden="true" className="traco-ativo absolute inset-x-2.5 -bottom-[13px] h-[3px] rounded-full bg-primary-container" /> : null}
      </button>

      {aberto ? (
        <div
          id="menu-mais-modulos"
          className="surge absolute top-full right-0 z-40 mt-3 w-72 overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface p-1.5 shadow-flutuante"
        >
          <ul className="flex flex-col gap-0.5">
            {MODULOS_EM_MAIS.map((item) => {
              const Icone = item.icone;
              const atual = ativo?.href === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={atual ? "page" : undefined}
                    onClick={() => fechar(false)}
                    className={cn(
                      "flex min-h-12 items-start gap-3 rounded-[var(--radius-controle)] px-3 py-2.5 transition-colors",
                      atual ? "bg-primary-fixed text-primary" : "text-on-surface hover:bg-surface-container-low",
                    )}
                  >
                    <Icone aria-hidden="true" size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {item.rotulo}
                        {item.emConstrucao ? (
                          <span className="rounded-[var(--radius-tag)] border border-card-border px-1.5 py-px text-[0.66rem] font-medium text-outline">em breve</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-outline">{item.finalidade}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

