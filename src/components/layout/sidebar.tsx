"use client";

import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { CLINICA } from "@/lib/nav";
import { MenuNavegacao } from "./sidebar-nav";

function Marca({ recolhida }: { recolhida: boolean }) {
  if (recolhida) {
    return (
      <span aria-hidden="true" className="relative flex size-11 items-center justify-center overflow-hidden rounded-[14px] border border-primary/10 bg-[linear-gradient(145deg,var(--color-primary-fixed),#ffffff)] text-sm font-bold text-primary shadow-[var(--shadow-cartao)]">
        <span className="absolute inset-x-2 top-0 h-px bg-white" />
        {CLINICA.monograma}
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-[1.28rem] leading-tight font-bold tracking-[-0.035em] text-primary">{CLINICA.nome}</p>
      <p className="mt-1.5 text-[0.68rem] font-semibold tracking-[0.13em] text-outline uppercase">{CLINICA.descricao}</p>
    </div>
  );
}

export function BarraLateral({ recolhida, aoAlternarRecolhida, gavetaAberta, aoFecharGaveta }: { recolhida: boolean; aoAlternarRecolhida: () => void; gavetaAberta: boolean; aoFecharGaveta: () => void }) {
  const gaveta = useRef<HTMLElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (gavetaAberta) botaoFechar.current?.focus();
  }, [gavetaAberta]);

  function prenderFoco(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key !== "Tab" || !gaveta.current) return;
    const focaveis = gaveta.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  const conteudo = (mostrarFechar: boolean, recolhidaAqui: boolean) => (
    <div className="flex h-full flex-col px-2 py-2.5">
      <div className={cn("mb-3 flex min-h-20 items-center justify-between gap-2 rounded-[18px] px-3", recolhidaAqui ? "justify-center" : "px-4")}>
        <Marca recolhida={recolhidaAqui} />
        {mostrarFechar ? (
          <button ref={botaoFechar} type="button" onClick={aoFecharGaveta} aria-label="Fechar menu" className="flex size-10 items-center justify-center rounded-[12px] text-on-surface-variant transition-[transform,background-color,color] duration-200 hover:bg-primary-fixed/40 hover:text-primary active:scale-95">
            <X aria-hidden="true" size={20} strokeWidth={1.6} />
          </button>
        ) : null}
      </div>

      <div className="rolagem-discreta flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <MenuNavegacao recolhido={recolhidaAqui} aoNavegar={mostrarFechar ? aoFecharGaveta : undefined} />
      </div>

      {!mostrarFechar ? (
        <div className="mt-4 border-t border-card-border/75 pt-3">
          <button type="button" onClick={aoAlternarRecolhida} aria-label={recolhidaAqui ? "Expandir menu" : "Recolher menu"} title={recolhidaAqui ? "Expandir menu" : "Recolher menu"} className={cn("flex min-h-11 w-full items-center rounded-[12px] text-sm text-on-surface-variant transition-[transform,background-color,color] duration-200 hover:bg-primary-fixed/40 hover:text-primary active:scale-[0.985]", recolhidaAqui ? "justify-center px-0" : "px-3")}>
            {recolhidaAqui ? <PanelLeftOpen aria-hidden="true" size={21} strokeWidth={1.6} /> : <><PanelLeftClose aria-hidden="true" size={21} strokeWidth={1.6} className="mr-3" /><span>Recolher menu</span></>}
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <aside className={cn("glass-surface hidden shrink-0 border-r transition-[width] duration-300 ease-out lg:block", recolhida ? "w-[82px]" : "w-[272px]")}>
        <div className="sticky top-0 h-screen">{conteudo(false, recolhida)}</div>
      </aside>

      <div className={cn("fixed inset-0 z-40 lg:hidden", gavetaAberta ? "pointer-events-auto" : "pointer-events-none")} inert={!gavetaAberta}>
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={aoFecharGaveta} className={cn("absolute inset-0 bg-[#10253a]/40 backdrop-blur-[5px] transition-opacity duration-300", gavetaAberta ? "opacity-100" : "opacity-0")} />
        <aside ref={gaveta} role="dialog" aria-modal="true" aria-label="Menu de módulos" onKeyDown={prenderFoco} className={cn("glass-surface absolute inset-y-0 left-0 w-[min(320px,88vw)] border-r shadow-[var(--shadow-flutuante)] transition-transform duration-300 ease-out", "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]", gavetaAberta ? "translate-x-0" : "-translate-x-full")}>
          {conteudo(true, false)}
        </aside>
      </div>
    </>
  );
}
