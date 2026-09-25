"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";
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
    <div className={cn("fixed inset-0 z-40 lg:hidden", aberta ? "pointer-events-auto" : "pointer-events-none")} inert={!aberta}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={aoFechar}
        className={cn("absolute inset-0 bg-on-surface/40 transition-opacity duration-300", aberta ? "opacity-100" : "opacity-0")}
      />
      <aside
        ref={gaveta}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de módulos"
        onKeyDown={prenderFoco}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col border-r border-card-border bg-surface shadow-flutuante transition-transform duration-300 ease-out",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          aberta ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-h-[var(--altura-barra)] items-center justify-between gap-3 border-b border-card-border px-4">
          <MarcaComNome />
          <button
            ref={botaoFechar}
            type="button"
            onClick={aoFechar}
            aria-label="Fechar menu"
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.7} />
          </button>
        </div>

        <div className="rolagem-discreta flex-1 overflow-y-auto px-3 py-4">
          <MenuNavegacao aoNavegar={aoFechar} />
        </div>
      </aside>
    </div>
  );
}
