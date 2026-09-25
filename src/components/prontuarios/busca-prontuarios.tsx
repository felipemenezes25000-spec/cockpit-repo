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
      className="relative overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface-container-low p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="rotulo text-primary">Pesquisa clínica</p>
          <p className="mt-1 text-xs leading-5 text-outline">Localize rapidamente um registro sem abrir várias fichas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-fixed bg-selecao px-2.5 py-1.5 text-xs font-semibold text-primary">
            <ShieldCheck aria-hidden="true" size={13} />
            Histórico versionado
          </span>
          <span aria-live="polite" className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant tabular">
            <ClipboardPlus aria-hidden="true" size={13} strokeWidth={1.65} className="text-primary" />
            {total === 1 ? "1 prontuário" : `${total} prontuários`}
          </span>
        </div>
      </div>

      <div className="w-full sm:max-w-2xl">
        <label htmlFor="busca-prontuario" className="mb-1.5 block text-[0.72rem] font-semibold text-on-surface-variant">Paciente ou título do registro</label>
        <div className="relative">
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
            <span className="pointer-events-none absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] bg-surface text-outline">
              <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
              <span className="sr-only">Buscando…</span>
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
