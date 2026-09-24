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

export function NavegacaoInferiorMobile({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const caminho = usePathname() ?? "/";
  const maisAtivo = !ITENS.some((item) => estaAtivo(caminho, item.href));

  return (
    <nav
      aria-label="Navegação rápida"
      className="glass-surface fixed inset-x-2 bottom-2 z-40 rounded-[22px] border border-white/85 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_22px_58px_-20px_rgba(8,41,76,0.4),inset_0_1px_0_rgba(255,255,255,0.98)] lg:hidden"
    >
      <div className="grid grid-cols-5 gap-1">
        {ITENS.map((item) => {
          const Icone = item.icone;
          const ativo = estaAtivo(caminho, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "group relative flex min-h-14 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[15px] px-1 text-[0.61rem] font-semibold transition-[transform,background-color,color] duration-180 active:scale-[0.965]",
                ativo ? "text-primary" : "text-outline hover:bg-white/50 hover:text-primary",
              )}
            >
              {ativo ? (
                <>
                  <span aria-hidden="true" className="absolute inset-x-1 inset-y-0 rounded-[14px] bg-[linear-gradient(180deg,rgba(209,232,255,0.62),rgba(255,255,255,0.48))]" />
                  <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-primary-container shadow-[0_0_9px_rgba(10,110,209,0.28)]" />
                </>
              ) : null}
              <span className={cn(
                "relative flex size-8 items-center justify-center rounded-[10px] transition-[transform,background-color,box-shadow] duration-180 group-active:scale-95",
                ativo ? "bg-white/78 shadow-[var(--shadow-cartao)]" : "bg-transparent",
              )}>
                <Icone aria-hidden="true" size={19} strokeWidth={ativo ? 1.9 : 1.55} />
              </span>
              <span className="relative max-w-full truncate leading-tight">{item.rotulo}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={aoAbrirMenu}
          className={cn(
            "group relative flex min-h-14 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[15px] px-1 text-[0.61rem] font-semibold transition-[transform,background-color,color] duration-180 active:scale-[0.965]",
            maisAtivo ? "text-primary" : "text-outline hover:bg-white/50 hover:text-primary",
          )}
          aria-label="Abrir todos os módulos"
          aria-current={maisAtivo ? "page" : undefined}
        >
          {maisAtivo ? (
            <>
              <span aria-hidden="true" className="absolute inset-x-1 inset-y-0 rounded-[14px] bg-[linear-gradient(180deg,rgba(209,232,255,0.62),rgba(255,255,255,0.48))]" />
              <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-primary-container shadow-[0_0_9px_rgba(10,110,209,0.28)]" />
            </>
          ) : null}
          <span className={cn(
            "relative flex size-8 items-center justify-center rounded-[10px] transition-[transform,background-color,box-shadow] duration-180 group-active:scale-95",
            maisAtivo ? "bg-white/78 shadow-[var(--shadow-cartao)]" : "bg-transparent",
          )}>
            <Menu aria-hidden="true" size={19} strokeWidth={maisAtivo ? 1.9 : 1.6} />
          </span>
          <span className="relative leading-tight">Mais</span>
        </button>
      </div>
    </nav>
  );
}
