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
  "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-controle)] px-0.5 text-[0.625rem] font-semibold transition-colors duration-150 active:bg-surface-container-low min-[360px]:text-[0.6875rem]";

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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-card-border bg-surface px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
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
              className={cn(CLASSE_ITEM, ativo ? "text-primary" : "text-on-surface-variant hover:text-primary")}
            >
              <Marcador ativo={ativo} />
              <Icone aria-hidden="true" size={21} strokeWidth={ativo ? 2 : 1.7} />
              {mostrarPendencias ? (
                <span aria-hidden="true" className="tabular absolute top-1.5 left-1/2 ml-1.5 flex min-w-4.5 items-center justify-center rounded-full border-2 border-surface bg-negativo px-1 text-[0.6rem] leading-3.5 font-bold text-on-primary">
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
          className={cn(CLASSE_ITEM, maisAtivo ? "text-primary" : "text-on-surface-variant hover:text-primary")}
          aria-label="Abrir todos os módulos"
          aria-current={maisAtivo ? "page" : undefined}
        >
          <Marcador ativo={maisAtivo} />
          <Menu aria-hidden="true" size={21} strokeWidth={maisAtivo ? 2 : 1.7} />
          <span className="leading-tight">Mais</span>
        </button>
      </div>
    </nav>
  );
}

function Marcador({ ativo }: { ativo: boolean }): ReactNode {
  if (!ativo) return null;
  return <span aria-hidden="true" className="traco-ativo absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary-container" />;
}
