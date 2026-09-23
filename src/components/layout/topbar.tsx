"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { MenuPerfil } from "./profile-menu";
import { capitalizar, formatarDataExtenso } from "@/lib/format";
import { hoje } from "@/lib/dates";
import { itemAtivo } from "@/lib/nav";
import type { UsuarioAtual } from "@/lib/perfil";

export const BarraSuperior = forwardRef<HTMLButtonElement, { aoAbrirGaveta: () => void; usuario: UsuarioAtual; pendenciasAltas: number }>(function BarraSuperior({ aoAbrirGaveta, usuario, pendenciasAltas }, ref) {
  const caminho = usePathname();
  const item = itemAtivo(caminho ?? "/");

  return (
    <header className="glass-surface sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b px-3 py-2 sm:min-h-20 sm:gap-4 sm:px-6 xl:px-10 2xl:px-14">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        <button ref={ref} type="button" onClick={aoAbrirGaveta} aria-label="Abrir menu" className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-on-surface-variant transition-[transform,background-color,color] duration-200 hover:bg-primary-fixed/40 hover:text-primary active:scale-95 lg:hidden"><Menu aria-hidden="true" size={22} strokeWidth={1.6} /></button>
        <div className="min-w-0">
          <h1 className="line-clamp-2 text-base leading-tight font-semibold tracking-[-0.02em] break-words text-primary sm:line-clamp-1 sm:text-[1.45rem]">{caminho === "/busca" ? "Busca global" : item?.rotulo ?? "Cockpit"}</h1>
          <p className="mt-1 hidden truncate text-xs font-medium text-outline sm:block">{capitalizar(formatarDataExtenso(hoje()))}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-4">
        <Link href="/busca" aria-label="Abrir busca global" className="flex size-10 items-center justify-center rounded-[12px] text-on-surface-variant transition-[transform,background-color,color] hover:bg-primary-fixed/40 hover:text-primary active:scale-95 lg:hidden"><Search aria-hidden="true" size={20} strokeWidth={1.6} /></Link>
        <form method="get" action="/busca" role="search" aria-label="Busca do cabeçalho" className="group hidden h-11 w-56 items-center gap-2 rounded-[14px] border border-card-border/90 bg-white/70 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),var(--shadow-cartao)] transition-[width,border-color,box-shadow,background-color] duration-300 focus-within:w-72 focus-within:border-primary/40 focus-within:bg-white/90 focus-within:shadow-[0_0_0_4px_rgba(10,110,209,0.08),var(--shadow-realce)] lg:flex xl:w-80 xl:focus-within:w-96">
          <button type="submit" aria-label="Buscar" className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-outline transition-colors group-focus-within:text-primary hover:text-primary"><Search aria-hidden="true" size={18} strokeWidth={1.6} /></button>
          <input type="search" name="q" minLength={2} maxLength={80} required aria-label="Buscar no sistema" placeholder="Paciente, atendimento, documento…" className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline" />
          <span aria-hidden="true" className="hidden rounded-[7px] border border-card-border bg-white/70 px-1.5 py-0.5 text-[0.64rem] font-semibold text-outline xl:inline">/</span>
        </form>

        <div className="flex items-center gap-1 sm:gap-3">
          <button type="button" aria-disabled="true" title="A central de notificações chega em uma próxima etapa" aria-label={`Notificações — ${pendenciasAltas} ${pendenciasAltas === 1 ? "pendência" : "pendências"} de prioridade alta. A central de notificações chega em uma próxima etapa.`} className="relative flex size-10 cursor-not-allowed items-center justify-center rounded-[12px] text-on-surface-variant">
            <Bell aria-hidden="true" size={21} strokeWidth={1.6} />
            {pendenciasAltas > 0 ? <span aria-hidden="true" className="tabular absolute top-0.5 right-0.5 flex min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-error px-1 text-[0.58rem] font-bold text-on-primary shadow-sm">{pendenciasAltas}</span> : null}
          </button>
          <div className="sm:border-l sm:border-card-border/80 sm:pl-3"><MenuPerfil usuario={usuario} /></div>
        </div>
      </div>
    </header>
  );
});
