"use client";

import { Bell, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { MenuPerfil } from "./profile-menu";
import { capitalizar, formatarDataExtenso } from "@/lib/format";
import { hoje } from "@/lib/dates";
import { itemAtivo } from "@/lib/nav";
import type { UsuarioAtual } from "@/lib/perfil";
import { pendenciasOrdenadas } from "@/data/pendings";

export const BarraSuperior = forwardRef<
  HTMLButtonElement,
  { aoAbrirGaveta: () => void; usuario: UsuarioAtual }
>(function BarraSuperior({ aoAbrirGaveta, usuario }, ref) {
  const caminho = usePathname();
  const item = itemAtivo(caminho ?? "/");
  const pendenciasAltas = pendenciasOrdenadas().filter(
    (p) => p.prioridade === "alta",
  ).length;

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-outline-variant bg-surface/80 px-4 backdrop-blur-md sm:px-8 xl:px-20">
      <div className="flex min-w-0 items-center gap-3">
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
          <h1 className="t-headline truncate text-primary">
            {item?.rotulo ?? "Cockpit"}
          </h1>
          <p className="mt-1 hidden truncate text-xs text-outline sm:block">
            {capitalizar(formatarDataExtenso(hoje()))}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:gap-6">
        {/* A busca ainda não pesquisa nada — o contorno tracejado avisa isso. */}
        <div
          className="hidden w-80 items-center gap-2 rounded-[var(--radius-controle)] border border-dashed border-outline-variant bg-surface-container-low px-4 py-2 text-sm text-outline xl:flex"
          title="A busca global chega em uma próxima etapa"
        >
          <Search aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate">Buscar paciente, atendimento ou documento</span>
        </div>

        <div className="flex items-center gap-4">
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

          <div className="border-l border-outline-variant pl-4">
            <MenuPerfil usuario={usuario} />
          </div>
        </div>
      </div>
    </header>
  );
});
