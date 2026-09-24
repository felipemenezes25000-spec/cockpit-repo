"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { forwardRef, useEffect, useRef, useState } from "react";
import { CommandPalette } from "./command-palette";
import { MenuPerfil } from "./profile-menu";
import { PreviewNotificacoes } from "./notifications-preview";
import { capitalizar, formatarDataExtenso } from "@/lib/format";
import { hoje } from "@/lib/dates";
import { itemAtivo } from "@/lib/nav";
import { cn } from "@/lib/cn";
import type { UsuarioAtual } from "@/lib/perfil";

export const BarraSuperior = forwardRef<HTMLButtonElement, { aoAbrirGaveta: () => void; usuario: UsuarioAtual; pendenciasAltas: number }>(function BarraSuperior({ aoAbrirGaveta, usuario, pendenciasAltas }, ref) {
  const caminho = usePathname();
  const item = itemAtivo(caminho ?? "/");
  const buscaRef = useRef<HTMLInputElement>(null);
  const [comandosAbertos, setComandosAbertos] = useState(false);
  const [elevada, setElevada] = useState(false);

  useEffect(() => {
    function atalho(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null;
      const editando =
        alvo instanceof HTMLInputElement ||
        alvo instanceof HTMLTextAreaElement ||
        alvo instanceof HTMLSelectElement ||
        Boolean(alvo?.isContentEditable);

      if (!editando && (evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setComandosAbertos(true);
        return;
      }

      if (!editando && evento.key === "/") {
        evento.preventDefault();
        buscaRef.current?.focus();
        buscaRef.current?.select();
        return;
      }

      if (evento.key === "Escape" && document.activeElement === buscaRef.current) buscaRef.current?.blur();
    }

    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  useEffect(() => {
    function aoRolar() {
      setElevada(window.scrollY > 8);
    }
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  const titulo = caminho === "/busca" ? "Busca global" : item?.rotulo ?? "Cockpit";

  return (
    <>
      <header className={cn(
        "glass-surface sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b px-3 py-2 transition-[background-color,box-shadow,border-color] duration-300 sm:min-h-20 sm:gap-4 sm:px-6 xl:px-10 2xl:px-14",
        elevada
          ? "border-card-border/95 bg-white/86 shadow-[0_12px_36px_-26px_rgba(8,41,76,0.42),inset_0_1px_0_rgba(255,255,255,0.95)]"
          : "border-card-border/65 shadow-none",
      )}>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button ref={ref} type="button" onClick={aoAbrirGaveta} aria-label="Abrir menu" className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-on-surface-variant transition-[transform,background-color,color] duration-200 hover:bg-primary-fixed/40 hover:text-primary active:scale-95 lg:hidden"><Menu aria-hidden="true" size={22} strokeWidth={1.6} /></button>
          <div className="min-w-0">
            <h1 key={titulo} className="page-reveal line-clamp-2 text-base leading-tight font-semibold tracking-[-0.02em] break-words text-primary sm:line-clamp-1 sm:text-[1.45rem]">{titulo}</h1>
            <p className="mt-1 hidden truncate text-xs font-medium text-outline sm:block">{capitalizar(formatarDataExtenso(hoje()))}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <button type="button" onClick={() => setComandosAbertos(true)} aria-label="Abrir busca e comandos rápidos" className="flex size-10 items-center justify-center rounded-[12px] text-on-surface-variant transition-[transform,background-color,color] hover:bg-primary-fixed/40 hover:text-primary active:scale-95 lg:hidden"><Search aria-hidden="true" size={20} strokeWidth={1.6} /></button>
          <form method="get" action="/busca" role="search" aria-label="Busca do cabeçalho" className="group hidden h-11 w-56 items-center gap-2 rounded-[14px] border border-card-border/90 bg-white/70 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),var(--shadow-cartao)] transition-[width,border-color,box-shadow,background-color] duration-300 focus-within:w-72 focus-within:border-primary/40 focus-within:bg-white/90 focus-within:shadow-[0_0_0_4px_rgba(10,110,209,0.08),var(--shadow-realce)] lg:flex xl:w-80 xl:focus-within:w-96">
            <button type="submit" aria-label="Buscar" className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-outline transition-colors group-focus-within:text-primary hover:text-primary"><Search aria-hidden="true" size={18} strokeWidth={1.6} /></button>
            <input ref={buscaRef} type="search" name="q" minLength={2} maxLength={80} required aria-label="Buscar no sistema" placeholder="Paciente, atendimento, documento…" className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline" />
            <span aria-hidden="true" className="hidden items-center gap-1 xl:flex">
              <kbd className="rounded-[7px] border border-card-border bg-white/75 px-1.5 py-0.5 text-[0.62rem] font-semibold text-outline shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">/</kbd>
              <span className="text-[0.58rem] text-outline/75">busca</span>
              <button type="button" tabIndex={-1} onClick={() => setComandosAbertos(true)} className="ml-1 rounded-[7px] border border-card-border bg-white/75 px-1.5 py-0.5 text-[0.62rem] font-semibold text-outline shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors hover:text-primary">Ctrl K</button>
            </span>
          </form>

          <div className="flex items-center gap-1 sm:gap-3">
            <PreviewNotificacoes pendenciasAltas={pendenciasAltas} />
            <div className="sm:border-l sm:border-card-border/80 sm:pl-3"><MenuPerfil usuario={usuario} /></div>
          </div>
        </div>
      </header>

      <CommandPalette aberta={comandosAbertos} aoFechar={() => setComandosAbertos(false)} papel={usuario.papel} />
    </>
  );
});
