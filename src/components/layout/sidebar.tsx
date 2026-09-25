"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";
import { cn } from "@/lib/cn";
import { MenuNavegacao } from "./sidebar-nav";

/**
 * A gaveta de módulos, abaixo de 1024 px. No computador os módulos ficam na
 * barra do topo e a gaveta não existe.
 */
export function GavetaDeModulos({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const gaveta = useRef<HTMLElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aberta) botaoFechar.current?.focus();
  }, [aberta]);

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

  return (
    <div data-aberta={aberta} className={cn("gaveta fixed inset-0 z-40 lg:hidden", aberta ? "pointer-events-auto" : "pointer-events-none")} inert={!aberta}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={aoFechar}
        className={cn("veu absolute inset-0 transition-opacity duration-300", aberta ? "opacity-100" : "opacity-0")}
      />
      <aside
        ref={gaveta}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de módulos"
        onKeyDown={prenderFoco}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(340px,90vw)] flex-col border-r border-card-border bg-surface shadow-[24px_0_70px_-34px_rgba(8,41,76,.55)] transition-transform duration-[380ms] ease-[var(--ease-suave)]",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          aberta ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative flex min-h-[var(--altura-barra)] items-center justify-between gap-3 overflow-hidden border-b border-card-border bg-[linear-gradient(145deg,#ffffff_0%,#f4f9ff_100%)] px-4">
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-36 rounded-full bg-primary-fixed/55 blur-2xl" />
          <MarcaComNome />
          <button
            ref={botaoFechar}
            type="button"
            onClick={aoFechar}
            aria-label="Fechar menu"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-on-surface-variant shadow-[0_8px_18px_-16px_rgba(8,41,76,.42)] transition-[transform,background-color,color] hover:-translate-y-0.5 hover:bg-selecao hover:text-primary"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.7} />
          </button>
        </div>

        <div className="rolagem-discreta rolagem-esmaecida flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-3 py-4">
          <MenuNavegacao aoNavegar={aoFechar} />
        </div>
      </aside>
    </div>
  );
}
