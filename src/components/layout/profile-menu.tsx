"use client";

import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { USUARIO_DEMO } from "@/lib/nav";

const OPCOES = [
  { rotulo: "Meus dados", icone: UserRound },
  { rotulo: "Perfis e permissões", icone: ShieldCheck },
  { rotulo: "Sair", icone: LogOut },
];

/**
 * Menu de perfil do usuário demonstrativo. As opções ainda não executam nada —
 * ficam indisponíveis com a razão à vista, em vez de simular uma ação.
 */
export function MenuPerfil() {
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
        <Avatar nome={USUARIO_DEMO.nome} />
        <span className="hidden flex-col text-left sm:flex">
          <span className="rotulo text-primary">{USUARIO_DEMO.nome}</span>
          <span className="mt-0.5 text-[0.625rem] font-medium text-outline">
            {USUARIO_DEMO.papel}
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
            <p className="font-medium text-on-surface">{USUARIO_DEMO.nome}</p>
            <p className="mt-0.5 text-xs text-outline">
              {USUARIO_DEMO.papel} · {USUARIO_DEMO.registro}
            </p>
          </div>
          <ul className="py-1">
            {OPCOES.map(({ rotulo, icone: Icone }) => (
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
          </ul>
          <p className="border-t border-card-border bg-surface-container-low px-4 py-2.5 text-xs text-outline">
            Login e permissões chegam em uma próxima etapa.
          </p>
        </div>
      ) : null}
    </div>
  );
}
