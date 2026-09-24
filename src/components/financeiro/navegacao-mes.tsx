"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { capitalizar, formatarMesAno } from "@/lib/format";
import type { Periodo } from "@/lib/periodo";

export function hrefDoMes(
  caminho: string,
  busca: string,
  chave: string | null,
  limpar: readonly string[] = [],
): string {
  const query = new URLSearchParams(busca);
  for (const parametro of limpar) query.delete(parametro);
  if (chave) query.set("mes", chave);
  else query.delete("mes");
  const texto = query.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

export function NavegacaoMes({
  periodo,
  rotulo = "Período financeiro",
  limparAoTrocar = [],
}: {
  periodo: Periodo;
  rotulo?: string;
  /**
   * Alguns filtros pertencem ao conjunto daquele mês (ex.: campanha da
   * Captação). Eles podem ser descartados ao navegar sem alterar o comportamento
   * padrão do Financeiro, que continua preservando seus próprios filtros.
   */
  limparAoTrocar?: readonly string[];
}) {
  const caminho = usePathname() ?? "/financeiro";
  const busca = useSearchParams()?.toString() ?? "";

  const seta =
    "group flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] border border-card-border bg-surface text-on-surface-variant transition-[transform,background-color,border-color,color] duration-150 hover:border-primary-fixed-dim hover:bg-selecao hover:text-primary active:translate-y-px active:scale-[0.97]";

  const endereco = (chave: string | null) => hrefDoMes(caminho, busca, chave, limparAoTrocar);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="premium-panel relative flex w-full items-center gap-2.5 overflow-hidden rounded-[var(--radius-painel)] border p-2 sm:w-auto">
        <Link href={endereco(periodo.chaveAnterior)} aria-label="Mês anterior" className={seta}>
          <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
        </Link>

        <span className="relative min-w-0 flex-1 px-2 text-center sm:min-w-44 sm:flex-none">
          <span className="rotulo block text-[0.62rem] text-outline">{rotulo}</span>
          <span className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold tracking-[-0.015em] text-on-surface">
            {periodo.ehMesAtual ? <span aria-hidden="true" className="size-1.5 rounded-full bg-positivo" /> : null}
            {capitalizar(formatarMesAno(periodo.de))}
          </span>
        </span>

        <Link href={endereco(periodo.chaveProxima)} aria-label="Mês seguinte" className={seta}>
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {!periodo.ehMesAtual ? (
        <Link
          href={endereco(null)}
          className="premium-interactive inline-flex h-10 items-center gap-2 rounded-[var(--radius-cartao)] border border-primary-fixed bg-selecao px-3.5 text-sm font-semibold text-primary hover:bg-primary-fixed"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary-container" />
          Mês atual
        </Link>
      ) : (
        <span className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-cartao)] border border-positivo-borda bg-positivo-fundo px-3.5 text-xs font-semibold text-positivo">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-positivo" />
          Período atual
        </span>
      )}
    </div>
  );
}
