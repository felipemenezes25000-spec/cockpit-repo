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

  return (
    <nav
      aria-label="Navegação rápida"
      className="glass-surface fixed inset-x-2 bottom-2 z-40 rounded-[20px] border border-white/80 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_18px_50px_-18px_rgba(8,41,76,0.35),inset_0_1px_0_rgba(255,255,255,0.95)] lg:hidden"
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
                "group relative flex min-h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-[14px] px-1 text-[0.62rem] font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97]",
                ativo ? "bg-primary-fixed/58 text-primary" : "text-outline hover:bg-white/55 hover:text-primary",
              )}
            >
              {ativo ? <span aria-hidden="true" className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-primary-container shadow-[0_0_8px_rgba(10,110,209,0.25)]" /> : null}
              <Icone aria-hidden="true" size={20} strokeWidth={ativo ? 1.9 : 1.55} className="transition-transform duration-150 group-active:scale-95" />
              <span className="max-w-full truncate">{item.rotulo}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={aoAbrirMenu}
          className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-[0.62rem] font-semibold text-outline transition-[transform,background-color,color] duration-150 hover:bg-white/55 hover:text-primary active:scale-[0.97]"
          aria-label="Abrir todos os módulos"
        >
          <Menu aria-hidden="true" size={20} strokeWidth={1.6} className="transition-transform duration-150 group-active:scale-95" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
