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
      <ul className="flex items-center gap-0.5 rounded-[var(--radius-controle)] border border-transparent p-0.5">
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
                  "group relative flex h-10 items-center gap-2 rounded-[var(--radius-controle)] px-2.5 text-sm font-medium whitespace-nowrap transition-[transform,background-color,color,box-shadow] duration-180 xl:px-3",
                  atual
                    ? "bg-gradient-to-b from-primary-fixed to-selecao font-semibold text-primary shadow-[0_10px_22px_-18px_rgba(8,84,160,.5)]"
                    : "text-on-surface-variant hover:-translate-y-0.5 hover:bg-surface-container-low hover:text-primary",
                )}
              >
                <Icone aria-hidden="true" size={19} strokeWidth={atual ? 2 : 1.7} className={cn("shrink-0 xl:hidden 2xl:block", atual && "drop-shadow-[0_2px_4px_rgba(8,84,160,.16)]")} />
                <span className="sr-only xl:not-sr-only">{rotulo}</span>
                {atual ? <span aria-hidden="true" className="traco-ativo absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-primary-container shadow-[0_2px_8px_rgba(8,84,160,.26)]" /> : null}
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
          "relative flex h-10 items-center gap-1.5 rounded-[var(--radius-controle)] px-2.5 text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-180 xl:px-3",
          dentro
            ? "bg-gradient-to-b from-primary-fixed to-selecao font-semibold text-primary shadow-[0_10px_22px_-18px_rgba(8,84,160,.5)]"
            : "text-on-surface-variant hover:-translate-y-0.5 hover:bg-surface-container-low hover:text-primary",
        )}
      >
        Mais
        <ChevronDown aria-hidden="true" size={15} strokeWidth={1.8} className={cn("transition-transform duration-150", aberto && "rotate-180")} />
        {dentro ? <span aria-hidden="true" className="traco-ativo absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-primary-container shadow-[0_2px_8px_rgba(8,84,160,.26)]" /> : null}
      </button>

      {aberto ? (
        <div
          id="menu-mais-modulos"
          className="surge absolute top-full right-0 z-40 mt-3 w-72 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface/98 p-2 shadow-[0_24px_70px_-30px_rgba(8,41,76,.52)] backdrop-blur-xl"
        >
          <div className="mb-1.5 px-2 py-1.5">
            <p className="rotulo text-primary">Mais módulos</p>
            <p className="mt-1 text-[0.68rem] leading-4 text-outline">Áreas de apoio, relatórios e configuração do Cockpit.</p>
          </div>
          <ul className="flex flex-col gap-1">
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
                      "premium-interactive flex min-h-12 items-start gap-3 rounded-[var(--radius-controle)] border px-3 py-2.5",
                      atual
                        ? "border-primary-fixed bg-selecao text-primary"
                        : "border-transparent text-on-surface hover:border-card-border hover:bg-surface-container-low",
                    )}
                  >
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)]", atual ? "bg-surface text-primary" : "bg-selecao text-primary")}>
                      <Icone aria-hidden="true" size={17} strokeWidth={1.7} />
                    </span>
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
