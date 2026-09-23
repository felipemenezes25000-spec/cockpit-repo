import Link from "next/link";
import { cn } from "@/lib/cn";

export type Aba = { href: string; rotulo: string; ativa: boolean; contagem?: number };

/**
 * Navegação entre as áreas de um módulo — Financeiro, Relacionamento.
 *
 * São links, não abas ARIA: cada área tem endereço próprio, então voltar pelo
 * navegador e mandar o link funcionam (AGENTS.md §6, regra 5). A área atual
 * leva `aria-current="page"`. No celular a faixa rola na horizontal dentro de
 * si mesma, sem empurrar a página, e um degradê na borda direita avisa que há
 * mais áreas além da vista.
 */
export function NavegacaoEmAbas({ rotulo, abas, className }: { rotulo: string; abas: Aba[]; className?: string }) {
  return (
    <nav aria-label={rotulo} className={cn("relative", className)}>
      <div className="rolagem-discreta overflow-x-auto">
        <ul className="flex min-w-max gap-1 border-b border-card-border">
          {abas.map((aba) => (
            <li key={aba.href}>
              <Link
                href={aba.href}
                aria-current={aba.ativa ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors",
                  aba.ativa
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:border-outline-variant hover:text-primary",
                )}
              >
                {aba.rotulo}
                {aba.contagem !== undefined && aba.contagem > 0 ? (
                  <span className="tabular rounded-full bg-secondary-fixed px-1.5 py-px text-[0.6875rem] font-semibold text-primary">
                    {aba.contagem}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 bottom-px w-8 bg-linear-to-l from-surface to-transparent sm:hidden"
      />
    </nav>
  );
}
