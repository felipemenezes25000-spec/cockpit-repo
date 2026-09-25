"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useEffect, useState } from "react";
import { SeloDaMarca } from "@/components/ui/marca-da-clinica";
import { ATALHOS, CLINICA } from "@/lib/nav";
import type { UsuarioAtual } from "@/lib/perfil";
import { estaEditando, useAtalhosLigados } from "./atalhos-de-tecla";
import { BarraDeModulos } from "./barra-de-modulos";
import { CommandPalette } from "./command-palette";
import { MenuPerfil } from "./profile-menu";
import { PreviewNotificacoes } from "./notifications-preview";
import { avisarQueVaiNavegar } from "./progresso-de-navegacao";

/**
 * A barra do topo: marca, os módulos, a busca (Ctrl K), as pendências e a
 * conta. O título da tela não mora aqui: cada tela tem o seu `<h1>`.
 */
export const BarraSuperior = forwardRef<HTMLButtonElement, { aoAbrirGaveta: () => void; usuario: UsuarioAtual; pendenciasAltas: number }>(function BarraSuperior({ aoAbrirGaveta, usuario, pendenciasAltas }, ref) {
  const router = useRouter();
  const [comandosAbertos, setComandosAbertos] = useState(false);
  const atalhosLigados = useAtalhosLigados();

  useEffect(() => {
    function atalho(evento: KeyboardEvent) {
      if (estaEditando(evento.target)) return;

      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setComandosAbertos(true);
        return;
      }

      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

      if (evento.key === "/") {
        evento.preventDefault();
        setComandosAbertos(true);
        return;
      }

      // Atalhos de uma tecla: só com a página em foco e se não foram desligados.
      if (!atalhosLigados || comandosAbertos || evento.repeat) return;
      const destino = ATALHOS.find((a) => a.tecla === evento.key.toLowerCase() && (!a.so || a.so.includes(usuario.papel)));
      if (destino) {
        evento.preventDefault();
        avisarQueVaiNavegar();
        router.push(destino.href);
      }
    }

    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, [atalhosLigados, comandosAbertos, router, usuario.papel]);

  return (
    <>
      <header className="topo-vivo sticky top-0 z-30 border-b border-card-border bg-surface">
        <div className="mx-auto flex h-[var(--altura-barra)] w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6 xl:px-10 2xl:px-14">
          <button
            ref={ref}
            type="button"
            onClick={aoAbrirGaveta}
            aria-label="Abrir menu"
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary lg:hidden"
          >
            <Menu aria-hidden="true" size={22} strokeWidth={1.7} />
          </button>

          <Link href="/" className="group flex shrink-0 items-center gap-2.5 rounded-[var(--radius-controle)] pr-1" aria-label={`${CLINICA.nome} — Visão Geral`}>
            <SeloDaMarca className="transition-colors group-hover:bg-primary-hover" />
            <span aria-hidden="true" className="hidden min-w-0 flex-col leading-tight sm:flex lg:hidden">
              <span className="text-sm font-bold tracking-[-0.01em] text-primary">{CLINICA.nome}</span>
              <span className="text-[0.6875rem] font-medium text-outline">Cockpit do consultório</span>
            </span>
          </Link>

          <span aria-hidden="true" className="mx-1 hidden h-7 w-px bg-card-border lg:block" />

          <BarraDeModulos className="hidden lg:block" />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setComandosAbertos(true)}
              aria-label="Buscar e abrir comandos"
              aria-keyshortcuts="Control+K"
              className="group flex h-10 items-center gap-2 rounded-[var(--radius-controle)] px-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary sm:border sm:border-borda-controle sm:bg-surface sm:pr-2 sm:hover:border-primary-container sm:hover:bg-surface"
            >
              <Search aria-hidden="true" size={18} strokeWidth={1.8} />
              <span aria-hidden="true" className="hidden text-outline sm:inline">Buscar</span>
              <span aria-hidden="true" className="ml-1 hidden items-center gap-1 md:flex">
                <kbd className="tecla">Ctrl</kbd>
                <kbd className="tecla">K</kbd>
              </span>
            </button>

            <PreviewNotificacoes pendenciasAltas={pendenciasAltas} />
            <MenuPerfil usuario={usuario} />
          </div>
        </div>
      </header>

      <CommandPalette aberta={comandosAbertos} aoFechar={() => setComandosAbertos(false)} papel={usuario.papel} />
    </>
  );
});
