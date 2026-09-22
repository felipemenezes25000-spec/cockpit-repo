"use client";

import { Check, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  buscarPacientesParaSelecao,
  type PacienteParaSelecao,
} from "@/server/acoes/agenda";

/**
 * Escolhe a paciente pelo nome, sem carregar a base inteira.
 *
 * Digitou, esperou 300 ms, a busca roda no servidor — mesma consulta e mesma
 * RLS da listagem — e devolve até 8 opções. A escolhida vira um campo
 * escondido `paciente_id`; é ele que a ação lê, nunca o texto digitado.
 *
 * Vem travado quando a paciente já é conhecida (marcado a partir da ficha).
 */
export function SeletorPaciente({
  inicial,
  erro,
  obrigatorio = true,
  aoEscolher,
}: {
  inicial: PacienteParaSelecao | null;
  erro?: string;
  obrigatorio?: boolean;
  aoEscolher?: (paciente: PacienteParaSelecao | null) => void;
}) {
  const [escolhida, setEscolhida] = useState<PacienteParaSelecao | null>(inicial);
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<PacienteParaSelecao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [falhouBusca, setFalhouBusca] = useState(false);
  const idLista = useId();
  const ultimaBusca = useRef(0);

  useEffect(() => {
    if (escolhida || termo.trim().length < 2) {
      setOpcoes([]);
      setBuscando(false);
      setFalhouBusca(false);
      return;
    }

    setBuscando(true);
    const numero = ++ultimaBusca.current;
    const relogio = setTimeout(async () => {
      try {
        const achadas = await buscarPacientesParaSelecao(termo);
        // Resposta antiga chegando depois da nova não pode sobrescrever.
        if (numero === ultimaBusca.current) {
          setOpcoes(achadas);
          setFalhouBusca(false);
        }
      } catch {
        // Sem conexão com o servidor: a lista esvazia e a tela diz por quê,
        // em vez de parecer que ninguém foi encontrada.
        if (numero === ultimaBusca.current) {
          setOpcoes([]);
          setFalhouBusca(true);
        }
      } finally {
        if (numero === ultimaBusca.current) setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(relogio);
  }, [termo, escolhida]);

  return (
    <Campo id="busca-paciente" rotulo="Paciente" obrigatorio={obrigatorio} erro={erro}>
      {/* O que a ação de servidor lê. Vazio enquanto ninguém foi escolhida. */}
      <input type="hidden" name="paciente_id" value={escolhida?.id ?? ""} />

      {escolhida ? (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-cartao)] border border-positivo-borda bg-positivo-fundo px-3.5 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm text-on-surface">
            <Check aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0 text-positivo" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{escolhida.nome}</span>
              <span className="block truncate text-xs text-outline">
                {escolhida.detalhe}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setEscolhida(null);
              setTermo("");
              aoEscolher?.(null);
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-surface hover:text-primary"
            aria-label="Trocar a paciente"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline"
          />
          <input
            id="busca-paciente"
            type="text"
            role="combobox"
            aria-expanded={opcoes.length > 0}
            aria-controls={idLista}
            aria-autocomplete="list"
            autoComplete="off"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por nome, telefone ou CPF"
            className={cn(ENTRADA, "pl-10", erro && ENTRADA_ERRO)}
            {...(erro ? { "aria-invalid": true as const } : {})}
          />
          {buscando ? (
            <LoaderCircle
              aria-hidden="true"
              size={16}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-outline"
            />
          ) : null}

          {opcoes.length > 0 ? (
            <ul
              id={idLista}
              role="listbox"
              aria-label="Pacientes encontradas"
              className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface shadow-[var(--shadow-flutuante)]"
            >
              {opcoes.map((opcao) => (
                <li key={opcao.id} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => {
                      setEscolhida(opcao);
                      aoEscolher?.(opcao);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <span className="text-sm font-medium text-on-surface">
                      {opcao.nome}
                    </span>
                    <span className="text-xs text-outline">{opcao.detalhe}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!buscando && falhouBusca ? (
            <p role="alert" className="mt-1.5 text-xs text-negativo">
              Não foi possível buscar agora. Confira a conexão e digite de novo.
            </p>
          ) : null}

          {!buscando && !falhouBusca && termo.trim().length >= 2 && opcoes.length === 0 ? (
            <p className="mt-1.5 text-xs text-outline">
              Nenhuma paciente encontrada. Confira a escrita ou{" "}
              <Link href="/pacientes/novo" className="text-primary underline">
                cadastre primeiro
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}
    </Campo>
  );
}
