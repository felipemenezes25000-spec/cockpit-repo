"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MENU, itemAtivo } from "@/lib/nav";

const SECOES = [
  { rotulo: "Operação", itens: MENU.slice(0, 4) },
  { rotulo: "Gestão", itens: MENU.slice(4, 7) },
  { rotulo: "Sistema", itens: MENU.slice(7) },
] as const;

/** A lista de módulos da gaveta, em três seções. */
export function MenuNavegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho ?? "/");

  return (
    <nav aria-label="Módulos do sistema">
      <div className="flex flex-col gap-5">
        {SECOES.map((secao) => (
          <section key={secao.rotulo} aria-label={secao.rotulo}>
            <p className="rotulo mb-2 px-3">{secao.rotulo}</p>
            <ul className="flex flex-col gap-0.5">
              {secao.itens.map((item) => {
                const Icone = item.icone;
                const estaAtivo = ativo?.href === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={aoNavegar}
                      aria-current={estaAtivo ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 rounded-[var(--radius-controle)] px-3 py-2 text-sm transition-colors duration-150",
                        estaAtivo
                          ? "bg-primary-fixed font-semibold text-primary"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
                      )}
                    >
                      {estaAtivo ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary-container" /> : null}
                      <Icone aria-hidden="true" size={19} strokeWidth={estaAtivo ? 2 : 1.7} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                      {item.emConstrucao ? (
                        <span className="shrink-0 rounded-[var(--radius-tag)] border border-card-border px-1.5 py-px text-[0.66rem] font-medium text-outline">em breve</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
