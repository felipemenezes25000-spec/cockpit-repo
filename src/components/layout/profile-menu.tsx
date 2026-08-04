"use client";

import { ChevronDown, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        gatilho.current?.focus();
      }
    }
    function aoClicarFora(e: MouseEvent) {
      if (!container.current?.contains(e.target as Node)) setAberto(false);
    }

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto]);

  return (
    <div ref={container} className="relative">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-[var(--radius-cartao)] p-1 transition-colors hover:bg-surface-container-low"
      >
        <Avatar nome={usuario.nome} />
        <span className="hidden flex-col text-left sm:flex">
          <span className="rotulo text-primary">{usuario.nome}</span>
          <span className="mt-0.5 text-[0.625rem] font-medium text-outline">
            {ROTULO_PAPEL[usuario.papel]}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={1.5}
          className={cn(
            "text-outline transition-transform duration-200",
            aberto && "rotate-180",
          )}
        />
      </button>

      {aberto ? (
        <div
          role="menu"
          aria-label="Menu do usuário"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface shadow-[var(--shadow-flutuante)]"
        >
          <div className="border-b border-card-border px-4 py-3">
            <p className="font-medium text-on-surface">{usuario.nome}</p>
            <p className="mt-0.5 truncate text-xs text-outline">
              {ROTULO_PAPEL[usuario.papel]}
              {usuario.email ? ` · ${usuario.email}` : ""}
            </p>
          </div>

          <ul className="py-1">
            {EM_BREVE.map(({ rotulo, icone: Icone }) => (
              <li key={rotulo}>
                <button
                  type="button"
                  role="menuitem"
                  aria-disabled="true"
                  title="Disponível em uma próxima etapa"
                  className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left text-sm text-outline"
                >
                  <Icone aria-hidden="true" size={18} strokeWidth={1.5} />
                  {rotulo}
                </button>
              </li>
            ))}
            <li className="border-t border-card-border">
              <BotaoSair
                comIcone
                className="w-full px-4 py-2.5 text-left text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              />
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
