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

export const BarraSuperior = forwardRef<
  HTMLButtonElement,
  { aoAbrirGaveta: () => void; usuario: UsuarioAtual; pendenciasAltas: number }
>(function BarraSuperior({ aoAbrirGaveta, usuario, pendenciasAltas }, ref) {
  const caminho = usePathname();
  const item = itemAtivo(caminho ?? "/");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-outline-variant bg-surface/90 px-3 backdrop-blur-md sm:h-20 sm:gap-4 sm:px-8 xl:px-20">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        <button
          ref={ref}
          type="button"
          onClick={aoAbrirGaveta}
          aria-label="Abrir menu"
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary lg:hidden"
        >
          <Menu aria-hidden="true" size={22} strokeWidth={1.5} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-lg leading-tight font-medium text-primary sm:text-2xl">
            {caminho === "/busca" ? "Busca global" : item?.rotulo ?? "Cockpit"}
          </h1>
          <p className="mt-1 hidden truncate text-xs text-outline sm:block">
            {capitalizar(formatarDataExtenso(hoje()))}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-6">
        <Link href="/busca" aria-label="Abrir busca global" className="flex size-10 items-center justify-center rounded-[var(--radius-cartao)] text-on-surface-variant hover:bg-surface-container-low hover:text-primary lg:hidden">
          <Search aria-hidden="true" size={20} strokeWidth={1.5} />
        </Link>
        <form method="get" action="/busca" role="search" aria-label="Busca do cabeçalho" className="hidden w-48 items-center gap-2 rounded-[var(--radius-controle)] border border-outline-variant bg-surface px-3 py-2 text-sm focus-within:border-primary lg:flex xl:w-80">
          <button type="submit" aria-label="Buscar" className="flex size-6 shrink-0 items-center justify-center text-outline hover:text-primary"><Search aria-hidden="true" size={18} strokeWidth={1.5} /></button>
          <input type="search" name="q" minLength={2} maxLength={80} required aria-label="Buscar no sistema" placeholder="Paciente, atendimento, documento…" className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline" />
        </form>

        <div className="flex items-center gap-1 sm:gap-4">
          <button
            type="button"
            aria-disabled="true"
            title="A central de notificações chega em uma próxima etapa"
            aria-label={`Notificações — ${pendenciasAltas} pendências de prioridade alta`}
            className="relative flex size-10 cursor-not-allowed items-center justify-center text-on-surface-variant"
          >
            <Bell aria-hidden="true" size={22} strokeWidth={1.5} />
            {pendenciasAltas > 0 ? (
              <span
                aria-hidden="true"
                className="tabular absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-[0.5625rem] font-bold text-on-primary"
              >
                {pendenciasAltas}
              </span>
            ) : null}
          </button>

          <div className="sm:border-l sm:border-outline-variant sm:pl-4">
            <MenuPerfil usuario={usuario} />
          </div>
        </div>
      </div>
    </header>
  );
});
