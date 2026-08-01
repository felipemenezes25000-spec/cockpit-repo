"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MENU, itemAtivo } from "@/lib/nav";

export function MenuNavegacao({
  recolhido,
  aoNavegar,
}: {
  recolhido: boolean;
  /** Fecha a gaveta no celular assim que a pessoa escolhe um módulo. */
  aoNavegar?: () => void;
}) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho ?? "/");

  return (
    <nav aria-label="Módulos do sistema" className="px-2">
      <ul className="flex flex-col gap-2">
        {MENU.map((item) => {
          const Icone = item.icone;
          const estaAtivo = ativo?.href === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={aoNavegar}
                aria-current={estaAtivo ? "page" : undefined}
                title={recolhido ? item.rotulo : undefined}
                className={cn(
                  "flex items-center rounded-[var(--radius-cartao)] py-3 transition-colors duration-200",
                  recolhido ? "justify-center px-0" : "px-4",
                  estaAtivo
                    ? "border-r-2 border-primary bg-secondary-fixed/30 font-bold text-primary"
                    : "text-on-surface-variant hover:bg-secondary-fixed/20 hover:text-primary",
                )}
              >
                <Icone
                  aria-hidden="true"
                  size={22}
                  strokeWidth={estaAtivo ? 1.9 : 1.5}
                  className={cn("shrink-0", !recolhido && "mr-4")}
                />
                {recolhido ? (
                  <span className="sr-only">{item.rotulo}</span>
                ) : (
                  <span className="truncate text-sm">{item.rotulo}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
