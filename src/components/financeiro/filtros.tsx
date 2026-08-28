"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * Filtros das listas do Financeiro, guardados na própria URL — mesma
 * decisão da busca de pacientes: recarregar, voltar pelo navegador e
 * mandar o link de uma visão filtrada funcionam. O mês (`?mes=`) é
 * preservado ao trocar qualquer filtro.
 *
 * Grupo pequeno vira chips; grupo grande vira select, para a linha de
 * filtros não virar uma parede de botões.
 */

export type OpcaoDeFiltro = { valor: string; rotulo: string };

export type GrupoDeFiltro = {
  /** Nome do parâmetro na URL. Vazio = primeira opção (todas). */
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

  // A URL pode mudar por fora (voltar no navegador, trocar o mês).
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

  // Espera a pessoa parar de digitar antes de navegar.
  useEffect(() => {
    if (!busca || termo === buscaAtual) return;
    const relogio = setTimeout(() => navegar({ [busca.param]: termo.trim() }), 350);
    return () => clearTimeout(relogio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {busca ? (
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline"
          />
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            maxLength={80}
            aria-label={busca.placeholder}
            placeholder={busca.placeholder}
            className={cn(ENTRADA, "h-9 pr-9 pl-10")}
          />
          {termo ? (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                navegar({ [busca.param]: "" });
              }}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <X aria-hidden="true" size={14} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      ) : null}

      {grupos.map((grupo) => {
        const atual = parametros?.get(grupo.param) ?? "";

        // Muitas opções: select. Poucas: chips.
        if (grupo.opcoes.length > 5) {
          return (
            <label key={grupo.param} className="flex items-center gap-2">
              <span className="rotulo">{grupo.rotulo}</span>
              <select
                value={atual}
                onChange={(e) => navegar({ [grupo.param]: e.target.value })}
                className={cn(ENTRADA, "h-9 w-auto")}
              >
                {grupo.opcoes.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <div
            key={grupo.param}
            role="group"
            aria-label={grupo.rotulo}
            className="flex rounded-[var(--radius-controle)] border border-outline-variant p-0.5"
          >
            {grupo.opcoes.map((opcao) => {
              const ativa = atual === opcao.valor;
              return (
                <label
                  key={opcao.valor}
                  className={cn(
                    "cursor-pointer rounded-[var(--radius-cartao)] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    ativa
                      ? "bg-secondary-fixed text-primary"
                      : "text-on-surface-variant hover:text-primary",
                  )}
                >
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
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin text-outline" />
      ) : null}
    </div>
  );
}
