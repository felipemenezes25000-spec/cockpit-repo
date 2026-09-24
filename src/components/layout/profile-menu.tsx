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
          "group flex items-center gap-3 rounded-[14px] border border-transparent p-1.5 pr-2 transition-[transform,background-color,border-color,box-shadow] duration-200 active:scale-[0.985]",
          aberto
            ? "border-primary/10 bg-white/80 shadow-[var(--shadow-cartao)]"
            : "hover:border-primary/10 hover:bg-white/60",
        )}
      >
        <span className="relative">
          <Avatar nome={usuario.nome} />
          <span aria-hidden="true" className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-positivo shadow-sm" />
        </span>
        <span className="hidden min-w-0 flex-col text-left sm:flex">
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
            "hidden text-outline transition-[transform,color] duration-200 group-hover:text-primary sm:block",
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
          className="glass-surface page-reveal absolute right-0 z-40 mt-3 w-[19rem] overflow-hidden rounded-[20px] border border-white/80 outline-none shadow-[0_28px_70px_-26px_rgba(7,35,66,0.45),var(--shadow-flutuante)] focus-visible:shadow-[0_0_0_3px_rgba(10,110,209,0.08),0_28px_70px_-26px_rgba(7,35,66,0.45),var(--shadow-flutuante)]"
        >
          <div className="relative overflow-hidden border-b border-card-border/75 px-4 py-4">
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full bg-primary-fixed/55 blur-3xl" />
            <div className="relative flex items-center gap-3.5">
              <Avatar nome={usuario.nome} tom="marca" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold tracking-[-0.015em] text-on-surface">{usuario.nome}</p>
                <p className="mt-0.5 truncate text-xs text-outline">{usuario.email ?? "Conta do consultório"}</p>
                <span className="mt-2 inline-flex rounded-[7px] border border-primary/10 bg-primary-fixed/45 px-2 py-1 text-[0.62rem] font-semibold tracking-[0.05em] text-primary uppercase">
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
                    className="group flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm text-outline"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-card-border/80 bg-white/55 text-outline-variant">
                      <Icone aria-hidden="true" size={16} strokeWidth={1.55} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{rotulo}</span>
                      <span className="mt-0.5 block text-[0.65rem] text-outline-variant">Em preparação</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-card-border/75 bg-white/32 p-2.5">
            <BotaoSair
              comIcone
              className="w-full rounded-[12px] px-3 py-2.5 text-left text-sm font-medium text-on-surface-variant transition-[transform,background-color,color,box-shadow] hover:bg-white/70 hover:text-primary hover:shadow-[var(--shadow-cartao)] active:scale-[0.99]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
