"use client";

import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MenuNavegacao } from "./sidebar-nav";

function Marca({ recolhida }: { recolhida: boolean }) {
  if (recolhida) {
    return (
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-[var(--radius-controle)] bg-secondary-fixed text-sm font-bold text-primary"
      >
        ÉP
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <p className="t-headline truncate font-bold text-primary">Dra. Érika Passos</p>
      <p className="rotulo mt-1">Consultório de estética</p>
    </div>
  );
}

export function BarraLateral({
  recolhida,
  aoAlternarRecolhida,
  gavetaAberta,
  aoFecharGaveta,
}: {
  recolhida: boolean;
  aoAlternarRecolhida: () => void;
  gavetaAberta: boolean;
  aoFecharGaveta: () => void;
}) {
  const conteudo = (mostrarFechar: boolean, recolhidaAqui: boolean) => (
    <div className="flex h-full flex-col p-2">
      <div
        className={cn(
          "mb-4 flex items-center justify-between gap-2 py-6",
          recolhidaAqui ? "justify-center px-0" : "px-4",
        )}
      >
        <Marca recolhida={recolhidaAqui} />
        {mostrarFechar ? (
          <button
            type="button"
            onClick={aoFecharGaveta}
            aria-label="Fechar menu"
            className="flex size-9 items-center justify-center rounded-[var(--radius-cartao)] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      <div className="rolagem-discreta flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <MenuNavegacao
          recolhido={recolhidaAqui}
          aoNavegar={mostrarFechar ? aoFecharGaveta : undefined}
        />
      </div>

      {!mostrarFechar ? (
        <div className="mt-auto border-t border-outline-variant pt-4">
          <button
            type="button"
            onClick={aoAlternarRecolhida}
            aria-label={recolhidaAqui ? "Expandir menu" : "Recolher menu"}
            title={recolhidaAqui ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "flex w-full items-center rounded-[var(--radius-cartao)] py-3 text-sm text-on-surface-variant transition-colors hover:bg-secondary-fixed/20 hover:text-primary",
              recolhidaAqui ? "justify-center px-0" : "px-4",
            )}
          >
            {recolhidaAqui ? (
              <PanelLeftOpen aria-hidden="true" size={22} strokeWidth={1.5} />
            ) : (
              <>
                <PanelLeftClose
                  aria-hidden="true"
                  size={22}
                  strokeWidth={1.5}
                  className="mr-4"
                />
                <span>Recolher menu</span>
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Permanente a partir de lg */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-outline-variant bg-surface transition-[width] duration-200 lg:block",
          recolhida ? "w-[76px]" : "w-64",
        )}
      >
        <div className="sticky top-0 h-screen">{conteudo(false, recolhida)}</div>
      </aside>

      {/* Gaveta em telas menores */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          gavetaAberta ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!gavetaAberta}
      >
        <button
          type="button"
          tabIndex={gavetaAberta ? 0 : -1}
          aria-label="Fechar menu"
          onClick={aoFecharGaveta}
          className={cn(
            "absolute inset-0 bg-on-surface/35 transition-opacity duration-200",
            gavetaAberta ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          role="dialog"
          aria-modal={gavetaAberta || undefined}
          aria-label="Menu de módulos"
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-outline-variant bg-surface shadow-[var(--shadow-flutuante)] transition-transform duration-200",
            gavetaAberta ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {conteudo(true, false)}
        </aside>
      </div>
    </>
  );
}
