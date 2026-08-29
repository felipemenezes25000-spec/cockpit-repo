"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";

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
  const primeiraRenderizacao = useRef(true);

  useEffect(() => setTermo(busca), [busca]);

  function navegar(novoTermo: string) {
    const query = new URLSearchParams(parametros?.toString() ?? "");

    if (novoTermo.trim()) query.set("busca", novoTermo.trim());
    else query.delete("busca");

    query.delete("pagina");

    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/prontuarios?${texto}` : "/prontuarios"));
  }

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    if (termo === busca) return;

    const relogio = setTimeout(() => navegar(termo), 350);
    return () => clearTimeout(relogio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  return (
    <form
      method="get"
      action="/prontuarios"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(termo);
      }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="relative w-full sm:max-w-md">
        <Search
          aria-hidden="true"
          size={18}
          strokeWidth={1.5}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline"
        />
        <input
          type="search"
          name="busca"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          maxLength={80}
          aria-label="Buscar prontuário por paciente ou título"
          placeholder="Buscar por paciente ou título"
          className={cn(ENTRADA, "pr-10 pl-11")}
        />

        {termo ? (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              navegar("");
            }}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        ) : null}

        {pendente ? (
          <LoaderCircle
            aria-hidden="true"
            size={16}
            className="absolute top-1/2 -right-6 -translate-y-1/2 animate-spin text-outline"
          />
        ) : null}
      </div>

      <span aria-live="polite" className="text-xs text-outline tabular">
        {total === 1 ? "1 prontuário" : `${total} prontuários`}
      </span>
    </form>
  );
}
