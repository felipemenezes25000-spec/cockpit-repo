"use client";

import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { classeDaOpcao, SEGMENTO_GRUPO } from "@/components/ui/segmento";

export type OpcaoDeFiltro = { valor: string; rotulo: string };

export type GrupoDeFiltro = {
  param: string;
  rotulo: string;
  opcoes: OpcaoDeFiltro[];
};

export function FiltrosFinanceiro({
  grupos,
  busca,
}: {
  grupos: GrupoDeFiltro[];
  busca?: { param: string; placeholder: string };
}) {
  const router = useRouter();
  const caminho = usePathname() ?? "/financeiro";
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const buscaAtual = busca ? (parametros?.get(busca.param) ?? "") : "";
  const [termo, setTermo] = useState(buscaAtual);

  useEffect(() => setTermo(buscaAtual), [buscaAtual]);

  function navegar(mudancas: Record<string, string>) {
    const query = new URLSearchParams(parametros?.toString() ?? "");
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) query.set(chave, valor);
      else query.delete(chave);
    }
    const texto = query.toString();
    iniciar(() => router.replace(texto ? `${caminho}?${texto}` : caminho));
  }

  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelarEspera() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  useEffect(() => cancelarEspera, []);

  function aoDigitar(param: string, valor: string) {
    setTermo(valor);
    cancelarEspera();
    relogio.current = setTimeout(() => navegar({ [param]: valor.trim() }), 350);
  }

  const quantidadeAtivos = grupos.reduce((total, grupo) => total + (parametros?.get(grupo.param) ? 1 : 0), 0) + (busca && termo ? 1 : 0);

  return (
    <div className="premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border p-3.5">
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.05em] text-on-surface-variant uppercase">
          <span className="flex size-7 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-primary">
            <SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.7} />
          </span>
          Filtros
        </span>
        {quantidadeAtivos > 0 ? (
          <span className="tabular rounded-full border border-primary-fixed bg-selecao px-2.5 py-1 text-[0.65rem] font-semibold text-primary">
            {quantidadeAtivos} {quantidadeAtivos === 1 ? "ativo" : "ativos"}
          </span>
        ) : null}
      </div>

      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
        {busca ? (
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" size={16} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline" />
            <input
              type="search"
              value={termo}
              onChange={(e) => aoDigitar(busca.param, e.target.value)}
              maxLength={80}
              aria-label={busca.placeholder}
              placeholder={busca.placeholder}
              className={cn(classeDeEntrada({ altura: "compacta", recuo: "buscaCompacta" }), "bg-surface")}
            />
            {termo ? (
              <button
                type="button"
                onClick={() => {
                  setTermo("");
                  cancelarEspera();
                  navegar({ [busca.param]: "" });
                }}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-95"
              >
                <X aria-hidden="true" size={14} strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        ) : null}

        {grupos.map((grupo) => {
          const atual = parametros?.get(grupo.param) ?? "";

          if (grupo.opcoes.length > 5) {
            return (
              <label key={grupo.param} className="flex w-full items-center gap-2 sm:w-auto">
                <span className="rotulo">{grupo.rotulo}</span>
                <select
                  value={atual}
                  onChange={(e) => navegar({ [grupo.param]: e.target.value })}
                  className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "min-w-0 flex-1 bg-surface font-medium sm:flex-none")}
                >
                  {grupo.opcoes.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>
                  ))}
                </select>
              </label>
            );
          }

          return (
            <div key={grupo.param} role="group" aria-label={grupo.rotulo} className={cn(SEGMENTO_GRUPO, "w-full bg-surface sm:w-auto")}>
              {grupo.opcoes.map((opcao) => {
                const ativa = atual === opcao.valor;
                return (
                  <label key={opcao.valor} className={classeDaOpcao(ativa)}>
                    <input
                      type="radio"
                      name={grupo.param}
                      value={opcao.valor}
                      checked={ativa}
                      onChange={() => navegar({ [grupo.param]: opcao.valor })}
                      className="sr-only"
                    />
                    {opcao.rotulo}
                  </label>
                );
              })}
            </div>
          );
        })}

        {pendente ? (
          <span role="status" className="inline-flex items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-2.5 py-1.5 text-xs text-outline">
            <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
            Atualizando…
          </span>
        ) : null}
      </div>
    </div>
  );
}
