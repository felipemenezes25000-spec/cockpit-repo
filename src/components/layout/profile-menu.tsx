"use client";

import { ChevronDown, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { BotaoSair } from "./botao-sair";
import { ROTULO_PAPEL, type UsuarioAtual } from "@/lib/perfil";

/** Opções que ainda não existem — visíveis, mas indisponíveis. */
const EM_BREVE = [
  { rotulo: "Meus dados", icone: UserRound },
  { rotulo: "Perfis e permissões", icone: ShieldCheck },
];

export function MenuPerfil({ usuario }: { usuario: UsuarioAtual }) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) window.requestAnimationFrame(() => gatilho.current?.focus());
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const id = window.requestAnimationFrame(() => painel.current?.focus());

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        fechar();
      }
    }
    function aoClicarFora(e: MouseEvent) {
      if (!container.current?.contains(e.target as Node)) fechar(false);
    }

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto, fechar]);

  return (
    <div ref={container} className="relative">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="menu-perfil"
        aria-label={`Conta de ${usuario.nome}`}
        className={cn(
          "group flex items-center gap-3 rounded-[var(--radius-controle)] p-1 transition-colors duration-150 md:pr-2 lg:pr-1",
          aberto ? "bg-selecao" : "hover:bg-surface-container-low",
        )}
      >
        <span className="relative">
          <Avatar nome={usuario.nome} />
          <span aria-hidden="true" className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-surface bg-positivo" />
        </span>
        <span className="hidden min-w-0 flex-col text-left md:flex lg:hidden">
          <span className="max-w-40 truncate text-sm font-semibold text-on-surface">{usuario.nome}</span>
          <span className="mt-0.5 text-[0.69rem] font-medium tracking-[0.02em] text-outline">
            {ROTULO_PAPEL[usuario.papel]}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={1.5}
          className={cn(
            "hidden text-outline transition-[transform,color] duration-200 group-hover:text-primary md:block lg:hidden",
            aberto && "rotate-180 text-primary",
          )}
        />
      </button>

      {aberto ? (
        <div
          ref={painel}
          id="menu-perfil"
          role="dialog"
          aria-label="Conta e perfil"
          tabIndex={-1}
          className="glass-surface surge absolute right-0 z-40 mt-3 w-[19rem] overflow-hidden rounded-[var(--radius-painel)] border border-card-border outline-none shadow-flutuante"
        >
          <div className="relative overflow-hidden border-b border-card-border px-4 py-4">
            <div className="relative flex items-center gap-3.5">
              <Avatar nome={usuario.nome} tom="marca" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold tracking-[-0.015em] text-on-surface">{usuario.nome}</p>
                <p className="mt-0.5 truncate text-xs text-outline">{usuario.email ?? "Conta do consultório"}</p>
                <span className="mt-2 inline-flex rounded-[var(--radius-tag)] border border-primary-fixed bg-selecao px-2 py-1 text-[0.62rem] font-semibold tracking-[0.05em] text-primary uppercase">
                  {ROTULO_PAPEL[usuario.papel]}
                </span>
              </div>
            </div>
          </div>

          <div className="px-2.5 py-2.5">
            <p className="px-2 pb-1.5 text-[0.62rem] font-semibold tracking-[0.08em] text-outline uppercase">Conta</p>
            <ul className="space-y-1">
              {EM_BREVE.map(({ rotulo, icone: Icone }) => (
                <li key={rotulo}>
                  <span
                    aria-disabled="true"
                    title="Disponível em uma próxima etapa"
                    className="group flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-[var(--radius-cartao)] px-3 py-2.5 text-left text-sm text-outline"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline">
                      <Icone aria-hidden="true" size={16} strokeWidth={1.55} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{rotulo}</span>
                      <span className="mt-0.5 block text-xs text-outline">Em preparação</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-card-border bg-surface p-2.5">
            <BotaoSair
              comIcone
              className="w-full rounded-[var(--radius-cartao)] px-3 py-2.5 text-left text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] hover:bg-surface-container-low hover:text-primary active:scale-[0.99]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
