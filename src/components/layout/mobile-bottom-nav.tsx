"use client";

import {
  CalendarDays,
  LayoutGrid,
  Menu,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Item = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
};

const ITENS: Item[] = [
  { href: "/", rotulo: "Início", icone: LayoutGrid },
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: "/pacientes", rotulo: "Pacientes", icone: Users },
  { href: "/financeiro", rotulo: "Financeiro", icone: Wallet },
];

function estaAtivo(caminho: string, href: string): boolean {
  if (href === "/") return caminho === "/";
  return caminho === href || caminho.startsWith(`${href}/`);
}

const CLASSE_ITEM =
  "relative flex min-h-[3.65rem] flex-col items-center justify-center gap-0.5 rounded-[calc(var(--radius-controle)+2px)] px-0.5 text-[0.625rem] font-semibold transition-[transform,background-color,color,box-shadow] duration-180 active:scale-[0.97] min-[360px]:text-[0.6875rem]";

/** A barra inferior do celular e do tablet: os quatro módulos do dia e "Mais". */
export function NavegacaoInferiorMobile({
  aoAbrirMenu,
  pendenciasAltas = 0,
}: {
  aoAbrirMenu: () => void;
  pendenciasAltas?: number;
}) {
  const caminho = usePathname() ?? "/";
  const maisAtivo = !ITENS.some((item) => estaAtivo(caminho, item.href));

  return (
    <nav
      aria-label="Navegação rápida"
      className="fixed inset-x-0 bottom-0 z-40 px-2 pt-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-[calc(var(--radius-painel)+4px)] border border-card-border bg-surface/94 p-1.5 shadow-[0_-10px_44px_-24px_rgba(8,41,76,.42),0_18px_50px_-34px_rgba(8,41,76,.5)] backdrop-blur-2xl">
        {ITENS.map((item) => {
          const Icone = item.icone;
          const ativo = estaAtivo(caminho, item.href);
          const mostrarPendencias = item.href === "/" && pendenciasAltas > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              aria-label={mostrarPendencias ? `${item.rotulo} — ${pendenciasAltas} ${pendenciasAltas === 1 ? "pendência prioritária" : "pendências prioritárias"}` : undefined}
              className={cn(
                CLASSE_ITEM,
                ativo
                  ? "bg-gradient-to-b from-primary-fixed to-selecao text-primary shadow-[0_10px_24px_-20px_rgba(8,84,160,.7)]"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
              )}
            >
              <Marcador ativo={ativo} />
              <span aria-hidden="true" className={cn("flex size-8 items-center justify-center rounded-[var(--radius-controle)] transition-[transform,background-color,color] duration-180", ativo ? "-translate-y-0.5 bg-surface text-primary shadow-[0_8px_18px_-15px_rgba(8,84,160,.65)]" : "bg-transparent")}>
                <Icone size={20} strokeWidth={ativo ? 2 : 1.7} />
              </span>
              {mostrarPendencias ? (
                <span aria-hidden="true" className="tabular absolute top-1 left-1/2 ml-1.5 flex min-w-4.5 items-center justify-center rounded-full border-2 border-surface bg-negativo px-1 text-[0.6rem] leading-3.5 font-bold text-on-primary shadow-sm">
                  {pendenciasAltas > 9 ? "9+" : pendenciasAltas}
                </span>
              ) : null}
              <span className="max-w-full truncate leading-tight">{item.rotulo}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={aoAbrirMenu}
          className={cn(
            CLASSE_ITEM,
            maisAtivo
              ? "bg-gradient-to-b from-primary-fixed to-selecao text-primary shadow-[0_10px_24px_-20px_rgba(8,84,160,.7)]"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
          )}
          aria-label="Abrir todos os módulos"
          aria-current={maisAtivo ? "page" : undefined}
        >
          <Marcador ativo={maisAtivo} />
          <span aria-hidden="true" className={cn("flex size-8 items-center justify-center rounded-[var(--radius-controle)] transition-[transform,background-color,color] duration-180", maisAtivo ? "-translate-y-0.5 bg-surface text-primary shadow-[0_8px_18px_-15px_rgba(8,84,160,.65)]" : "bg-transparent")}>
            <Menu size={20} strokeWidth={maisAtivo ? 2 : 1.7} />
          </span>
          <span className="leading-tight">Mais</span>
        </button>
      </div>
    </nav>
  );
}

function Marcador({ ativo }: { ativo: boolean }): ReactNode {
  if (!ativo) return null;
  return <span aria-hidden="true" className="traco-ativo absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary-container shadow-[0_2px_8px_rgba(8,84,160,.28)]" />;
}
