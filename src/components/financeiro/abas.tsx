"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * As áreas do módulo Financeiro. Despesas, taxas e fluxo não aparecem para a
 * recepção — o servidor e a RLS barram de qualquer jeito; aqui só não se
 * oferece a porta que não abre.
 *
 * O fluxo entrou nessa lista porque a tabela inteira é entradas menos saídas:
 * sem enxergar despesa, resultado e acumulado sairiam errados em toda linha.
 */
export function AbasFinanceiro({ podeFinanceiro }: { podeFinanceiro: boolean }) {
  const caminho = usePathname() ?? "";

  const abas = [
    { href: "/financeiro", rotulo: "Visão geral", exato: true },
    { href: "/financeiro/vendas", rotulo: "Vendas" },
    ...(podeFinanceiro
      ? [
          { href: "/financeiro/despesas", rotulo: "Despesas" },
          { href: "/financeiro/taxas", rotulo: "Taxas de cartão" },
        ]
      : []),
    { href: "/financeiro/movimentacoes", rotulo: "Movimentações" },
    ...(podeFinanceiro ? [{ href: "/financeiro/fluxo", rotulo: "Fluxo mensal" }] : []),
  ];

  return (
    <nav aria-label="Áreas do financeiro" className="overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-card-border">
        {abas.map((aba) => {
          const ativa = aba.exato ? caminho === aba.href : caminho.startsWith(aba.href);
          return (
            <li key={aba.href}>
              <Link
                href={aba.href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "inline-flex items-center border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  ativa
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-primary",
                )}
              >
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
