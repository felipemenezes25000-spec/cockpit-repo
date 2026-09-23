"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { classeDaOpcao, SEGMENTO_GRUPO } from "@/components/ui/segmento";

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

  // Espera a pessoa parar de digitar antes de navegar. O relógio vive no
  // evento de digitação, não num efeito: cada tecla reinicia a espera, e
  // limpar a busca cancela a navegação que ainda estava agendada.
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

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {busca ? (
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline"
          />
          <input
            type="search"
            value={termo}
            onChange={(e) => aoDigitar(busca.param, e.target.value)}
            maxLength={80}
            aria-label={busca.placeholder}
            placeholder={busca.placeholder}
            className={classeDeEntrada({ altura: "compacta", recuo: "buscaCompacta" })}
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
            // No celular o select ocupa o que sobra da linha, sem passar da
            // borda do cartão ("Todas as categorias" é mais largo que 280 px
            // menos o rótulo).
            <label key={grupo.param} className="flex w-full items-center gap-2 sm:w-auto">
              <span className="rotulo">{grupo.rotulo}</span>
              <select
                value={atual}
                onChange={(e) => navegar({ [grupo.param]: e.target.value })}
                className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "min-w-0 flex-1 sm:flex-none")}
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
            className={cn(SEGMENTO_GRUPO, "w-full sm:w-auto")}
          >
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
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin text-outline" />
      ) : null}
    </div>
  );
}
