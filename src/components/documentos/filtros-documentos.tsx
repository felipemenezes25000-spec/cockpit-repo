"use client";

import { FileSignature, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
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

const SITUACOES: SituacaoDocumento[] = ["emitido", "assinado", "cancelado", "substituido"];

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
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setTermo(busca), [busca]);

  function cancelarEspera() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  useEffect(() => cancelarEspera, []);

  function navegar(mudancas: Record<string, string>) {
    cancelarEspera();
    const query = new URLSearchParams(parametros?.toString() ?? "");

    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) query.set(chave, valor);
      else query.delete(chave);
    }

    query.delete("pagina");
    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/formularios?${texto}` : "/formularios"));
  }

  function aoDigitar(valor: string) {
    setTermo(valor);
    cancelarEspera();
    if (valor.trim() === busca) return;
    relogio.current = setTimeout(() => navegar({ busca: valor.trim() }), 350);
  }

  const seletor = `${classeDeEntrada()} bg-surface font-medium shadow-[0_8px_20px_-18px_rgba(7,57,112,.45)] lg:w-auto`;
  const filtrosAtivos = Number(Boolean(busca)) + Number(Boolean(situacao)) + Number(Boolean(tipo));

  return (
    <form
      method="get"
      action="/formularios"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar({ busca: termo.trim() });
      }}
      className="relative min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface-container-low p-4 sm:p-5"
    >
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
            <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="rotulo text-primary">Refine os documentos</p>
            <p className="mt-1 max-w-2xl break-words text-xs leading-5 text-outline">Pesquise por paciente ou título e combine situação e tipo.</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span aria-live="polite" className="tabular inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
            <FileSignature aria-hidden="true" size={13} strokeWidth={1.65} className="shrink-0 text-primary" />
            <span className="min-w-0 break-words">{total === 1 ? "1 documento" : `${total} documentos`}</span>
          </span>
          {filtrosAtivos > 0 ? (
            <span className="tabular max-w-full rounded-full border border-primary-fixed bg-selecao px-2.5 py-1 text-[0.65rem] font-semibold text-primary">
              {filtrosAtivos} {filtrosAtivos === 1 ? "filtro ativo" : "filtros ativos"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <div className="min-w-0">
          <label htmlFor="busca-documento" className="mb-1.5 block break-words text-[0.72rem] font-semibold text-on-surface-variant">Paciente ou título</label>
          <div className="relative w-full min-w-0">
            <Search aria-hidden="true" size={18} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-primary" />
            <input
              id="busca-documento"
              type="search"
              name="busca"
              value={termo}
              onChange={(evento) => aoDigitar(evento.target.value)}
              maxLength={80}
              aria-label="Buscar documento por paciente ou título"
              placeholder="Buscar por paciente ou título"
              className={`${classeDeEntrada({ recuo: "busca" })} bg-surface shadow-[0_8px_20px_-18px_rgba(7,57,112,.45)]`}
            />
            {pendente ? (
              <span role="status" className="pointer-events-none absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] bg-surface text-primary shadow-[0_6px_14px_-12px_rgba(7,57,112,.4)]">
                <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
                <span className="sr-only">Buscando documentos…</span>
              </span>
            ) : termo ? (
              <button
                type="button"
                onClick={() => {
                  setTermo("");
                  navegar({ busca: "" });
                }}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-95"
              >
                <X aria-hidden="true" size={16} strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="situacao-documento" className="mb-1.5 block text-[0.72rem] font-semibold text-on-surface-variant">Situação</label>
          <select id="situacao-documento" name="situacao" value={situacao} onChange={(evento) => navegar({ situacao: evento.target.value })} aria-label="Filtrar por situação" className={seletor}>
            <option value="">Todas as situações</option>
            {SITUACOES.map((valor) => <option key={valor} value={valor}>{ROTULO_SITUACAO[valor]}</option>)}
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor="tipo-documento" className="mb-1.5 block text-[0.72rem] font-semibold text-on-surface-variant">Tipo</label>
          <select id="tipo-documento" name="tipo" value={tipo} onChange={(evento) => navegar({ tipo: evento.target.value })} aria-label="Filtrar por tipo" className={seletor}>
            <option value="">Todos os tipos</option>
            {TIPOS_EM_USO.map((valor: TipoDocumento) => <option key={valor} value={valor}>{ROTULO_TIPO[valor]}</option>)}
          </select>
        </div>
      </div>
    </form>
  );
}
