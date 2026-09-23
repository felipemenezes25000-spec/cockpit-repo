"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import {
  ROTULO_SITUACAO,
  ROTULO_TIPO,
  TIPOS_EM_USO,
  type SituacaoDocumento,
  type TipoDocumento,
} from "@/lib/documento";

const SITUACOES: SituacaoDocumento[] = [
  "emitido",
  "assinado",
  "cancelado",
  "substituido",
];

/**
 * Busca e filtros do módulo, guardados na URL.
 *
 * Estado de tela vai para a URL (invariante §9): recarregar, voltar e mandar
 * o link de uma visão filtrada precisam funcionar. Trocar qualquer filtro
 * zera a página — continuar na página 3 de um resultado que agora tem uma
 * página só mostraria uma lista vazia sem explicação.
 */
export function FiltrosDocumentos({
  busca,
  situacao,
  tipo,
  total,
}: {
  busca: string;
  situacao: string;
  tipo: string;
  total: number;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [termo, setTermo] = useState(busca);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => setTermo(busca), [busca]);

  function navegar(mudancas: Record<string, string>) {
    const query = new URLSearchParams(parametros?.toString() ?? "");

    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) query.set(chave, valor);
      else query.delete(chave);
    }

    query.delete("pagina");

    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/formularios?${texto}` : "/formularios"));
  }

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    if (termo === busca) return;

    const relogio = setTimeout(() => navegar({ busca: termo.trim() }), 350);
    return () => clearTimeout(relogio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  const seletor =
    "h-11 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none transition-colors focus-visible:border-primary";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            size={18}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline"
          />
          <input
            type="search"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            maxLength={80}
            aria-label="Buscar documento por paciente ou título"
            placeholder="Buscar por paciente ou título"
            className={classeDeEntrada({ recuo: "busca" })}
          />
          {termo ? (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                navegar({ busca: "" });
              }}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <X aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        <select
          value={situacao}
          onChange={(evento) => navegar({ situacao: evento.target.value })}
          aria-label="Filtrar por situação"
          className={seletor}
        >
          <option value="">Todas as situações</option>
          {SITUACOES.map((valor) => (
            <option key={valor} value={valor}>
              {ROTULO_SITUACAO[valor]}
            </option>
          ))}
        </select>

        <select
          value={tipo}
          onChange={(evento) => navegar({ tipo: evento.target.value })}
          aria-label="Filtrar por tipo"
          className={seletor}
        >
          <option value="">Todos os tipos</option>
          {TIPOS_EM_USO.map((valor: TipoDocumento) => (
            <option key={valor} value={valor}>
              {ROTULO_TIPO[valor]}
            </option>
          ))}
        </select>

        {pendente ? (
          <LoaderCircle
            aria-hidden="true"
            size={16}
            className="shrink-0 animate-spin text-outline"
          />
        ) : null}
      </div>

      <span aria-live="polite" className="tabular text-xs text-outline">
        {total === 1 ? "1 documento" : `${total} documentos`}
      </span>
    </div>
  );
}
