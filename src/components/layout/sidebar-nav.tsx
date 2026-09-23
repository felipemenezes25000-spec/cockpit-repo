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
                title={recolhido ? `${item.rotulo}${item.emConstrucao ? " (em breve)" : ""}` : undefined}
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
                  className={cn("shrink-0", !recolhido && "mr-3")}
                />
                {recolhido ? (
                  <span className="sr-only">
                    {item.rotulo}
                    {item.emConstrucao ? " (em breve)" : ""}
                  </span>
                ) : (
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="text-sm leading-snug">{item.rotulo}</span>
                    {item.emConstrucao ? (
                      <span className="shrink-0 rounded-[var(--radius-tag)] border border-dashed border-outline px-1.5 py-0.5 text-[0.6875rem] font-normal text-on-surface-variant">
                        em breve
                      </span>
                    ) : null}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
