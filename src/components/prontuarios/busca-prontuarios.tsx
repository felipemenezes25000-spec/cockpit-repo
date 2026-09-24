"use client";

import { ClipboardPlus, LoaderCircle, Search, X } from "lucide-react";
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
      className="premium-panel relative flex flex-col gap-4 overflow-hidden rounded-[16px] border p-3.5 shadow-[var(--shadow-cartao)] sm:flex-row sm:items-center sm:justify-between"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-36 rounded-full bg-primary-fixed/28 blur-3xl" />

      <div className="relative w-full sm:max-w-md">
        <Search aria-hidden="true" size={18} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline" />
        <input
          type="search"
          name="busca"
          value={termo}
          onChange={(evento) => aoDigitar(evento.target.value)}
          maxLength={80}
          aria-label="Buscar prontuário por paciente ou título"
          placeholder="Buscar por paciente ou título"
          className={`${classeDeEntrada({ recuo: "busca" })} bg-white/78 shadow-[var(--shadow-cartao)]`}
        />

        {pendente ? (
          <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5 rounded-[8px] bg-white/88 px-2 py-1 text-[0.65rem] font-medium text-outline shadow-[var(--shadow-cartao)]">
            <LoaderCircle aria-hidden="true" size={13} className="animate-spin" />
            buscando
          </span>
        ) : termo ? (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              navegar("");
            }}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[9px] text-outline transition-[transform,background-color,color] duration-150 hover:bg-primary-fixed/40 hover:text-primary active:scale-95"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <span aria-live="polite" className="relative inline-flex items-center gap-1.5 self-start rounded-full border border-card-border/75 bg-white/68 px-2.5 py-1.5 text-xs text-outline shadow-[var(--shadow-cartao)] tabular sm:self-auto">
        <ClipboardPlus aria-hidden="true" size={13} strokeWidth={1.65} className="text-primary" />
        {total === 1 ? "1 prontuário" : `${total} prontuários`}
      </span>
    </form>
  );
}
