"use client";

import { LoaderCircle, Search, X } from "lucide-react";
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

  // A URL pode mudar por fora (voltar no navegador, link da paginação).
  useEffect(() => setTermo(busca), [busca]);

  // Sair da tela no meio da pausa não pode navegar depois.
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

  // A espera fica no próprio evento de digitação, e não num efeito que
  // observa `termo`: assim só a pessoa digitando dispara a busca, nunca a
  // sincronização com a URL acima.
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
          onChange={(evento) => aoDigitar(evento.target.value)}
          maxLength={80}
          aria-label="Buscar prontuário por paciente ou título"
          placeholder="Buscar por paciente ou título"
          className={classeDeEntrada({ recuo: "busca" })}
        />

        {/* Carregando ocupa o lugar do "limpar", dentro da caixa: fora dela
            (-right-6), no celular o ícone passava da borda do cartão. */}
        {pendente ? (
          <LoaderCircle
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-outline"
          />
        ) : termo ? (
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
      </div>

      <span aria-live="polite" className="text-xs text-outline tabular">
        {total === 1 ? "1 prontuário" : `${total} prontuários`}
      </span>
    </form>
  );
}
