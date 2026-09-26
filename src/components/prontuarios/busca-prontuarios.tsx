"use client";

import { ClipboardPlus, LoaderCircle, Search, ShieldCheck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";

export function BuscaProntuarios({
  busca,
  total,
}: {
  busca: string;
  total: number;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [termo, setTermo] = useState(busca);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setTermo(busca), [busca]);
  useEffect(() => () => pararRelogio(), []);

  function pararRelogio() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  function navegar(novoTermo: string) {
    pararRelogio();
    const query = new URLSearchParams(parametros?.toString() ?? "");

    if (novoTermo.trim()) query.set("busca", novoTermo.trim());
    else query.delete("busca");

    query.delete("pagina");

    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/prontuarios?${texto}` : "/prontuarios"));
  }

  function aoDigitar(novoTermo: string) {
    setTermo(novoTermo);
    pararRelogio();
    if (novoTermo.trim() === busca) return;
    relogio.current = setTimeout(() => navegar(novoTermo), 350);
  }

  return (
    <form
      method="get"
      action="/prontuarios"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(termo);
      }}
      className="relative min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface-container-low p-4 sm:p-5"
    >
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="rotulo text-primary">Pesquisa clínica</p>
          <p className="mt-1 max-w-2xl break-words text-xs leading-5 text-outline">Localize rapidamente um registro sem abrir várias fichas.</p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-primary-fixed bg-selecao px-2.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck aria-hidden="true" size={13} className="shrink-0" />
            <span className="min-w-0 break-words">Histórico versionado</span>
          </span>
          <span aria-live="polite" className="tabular inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
            <ClipboardPlus aria-hidden="true" size={13} strokeWidth={1.65} className="shrink-0 text-primary" />
            <span className="min-w-0 break-words">{total === 1 ? "1 prontuário" : `${total} prontuários`}</span>
          </span>
        </div>
      </div>

      <div className="w-full min-w-0 sm:max-w-2xl">
        <label htmlFor="busca-prontuario" className="mb-1.5 block break-words text-[0.72rem] font-semibold text-on-surface-variant">Paciente ou título do registro</label>
        <div className="relative min-w-0">
          <Search aria-hidden="true" size={18} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-primary" />
          <input
            id="busca-prontuario"
            type="search"
            name="busca"
            value={termo}
            onChange={(evento) => aoDigitar(evento.target.value)}
            maxLength={80}
            aria-label="Buscar prontuário por paciente ou título"
            placeholder="Buscar por paciente ou título"
            className={`${classeDeEntrada({ recuo: "busca" })} bg-surface shadow-[0_8px_20px_-18px_rgba(7,57,112,.45)]`}
          />

          {pendente ? (
            <span role="status" className="pointer-events-none absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] bg-surface text-primary shadow-[0_6px_14px_-12px_rgba(7,57,112,.4)]">
              <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
              <span className="sr-only">Buscando prontuários…</span>
            </span>
          ) : termo ? (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                navegar("");
              }}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-95"
            >
              <X aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
