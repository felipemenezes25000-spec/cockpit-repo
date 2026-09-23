"use client";

import { usePathname } from "next/navigation";
import { NavegacaoEmAbas } from "@/components/ui/abas";

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

  const areas = [
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
    <NavegacaoEmAbas
      rotulo="Áreas do financeiro"
      abas={areas.map((area) => ({
        href: area.href,
        rotulo: area.rotulo,
        ativa: area.exato ? caminho === area.href : caminho.startsWith(area.href),
      }))}
    />
  );
}
