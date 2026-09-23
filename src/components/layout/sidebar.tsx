"use client";

import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { CLINICA } from "@/lib/nav";
import { MenuNavegacao } from "./sidebar-nav";

function Marca({ recolhida }: { recolhida: boolean }) {
  if (recolhida) {
    return (
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-[var(--radius-controle)] bg-secondary-fixed text-sm font-bold text-primary"
      >
        {CLINICA.monograma}
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <p className="t-headline truncate font-bold text-primary">{CLINICA.nome}</p>
      <p className="rotulo mt-1">{CLINICA.descricao}</p>
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
  const gaveta = useRef<HTMLElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  // Ao abrir, o foco entra na gaveta — quem navega por teclado não fica
  // preso no botão que a abriu, atrás do fundo escurecido.
  useEffect(() => {
    if (gavetaAberta) botaoFechar.current?.focus();
  }, [gavetaAberta]);

  /** Com a gaveta aberta, o Tab circula só dentro dela (é um diálogo modal). */
  function prenderFoco(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key !== "Tab" || !gaveta.current) return;
    const focaveis = gaveta.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
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
            ref={botaoFechar}
            type="button"
            onClick={aoFecharGaveta}
            aria-label="Fechar menu"
            className="flex size-10 items-center justify-center rounded-[var(--radius-cartao)] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
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

      {/* Gaveta em telas menores. Fechada, fica `inert`: fora da ordem do
          Tab e do leitor de tela — sem isso os links invisíveis continuavam
          recebendo foco. */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          gavetaAberta ? "pointer-events-auto" : "pointer-events-none",
        )}
        inert={!gavetaAberta}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={aoFecharGaveta}
          className={cn(
            "absolute inset-0 bg-on-surface/35 transition-opacity duration-200",
            gavetaAberta ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          ref={gaveta}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de módulos"
          onKeyDown={prenderFoco}
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
