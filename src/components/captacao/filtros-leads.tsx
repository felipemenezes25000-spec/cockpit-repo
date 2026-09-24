"use client";

import { LoaderCircle, Search, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import { ETAPAS_FUNIL, ROTULO_ETAPA } from "@/lib/captacao";
import type { FiltroEtapaLead } from "@/server/consultas/captacao-leads";

export function FiltrosLeads({
  busca,
  etapa,
  total,
}: {
  busca: string;
  etapa: FiltroEtapaLead;
  total: number;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [termo, setTermo] = useState(busca);
  const [enviado, setEnviado] = useState(busca);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTermo(busca);
    setEnviado(busca);
  }, [busca]);

  useEffect(() => {
    const espera = relogio;
    return () => {
      if (espera.current) clearTimeout(espera.current);
    };
  }, []);

  function cancelarEspera() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  function navegar(novoTermo: string, novaEtapa: FiltroEtapaLead) {
    cancelarEspera();
    const query = new URLSearchParams(parametros?.toString() ?? "");
    const limpo = novoTermo.trim();

    if (limpo) query.set("busca", limpo);
    else query.delete("busca");

    if (novaEtapa !== "todos") query.set("etapa", novaEtapa);
    else query.delete("etapa");

    query.delete("pagina");
    setEnviado(limpo);
    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/captacao?${texto}` : "/captacao"));
  }

  function digitar(valor: string) {
    setTermo(valor);
    cancelarEspera();
    if (valor.trim() === enviado) return;
    relogio.current = setTimeout(() => navegar(valor, etapa), 350);
  }

  return (
    <form
      method="get"
      action="/captacao"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(termo, etapa);
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low p-3.5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="relative w-full lg:max-w-md">
        <Search aria-hidden="true" size={17} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline" />
        <input
          type="search"
          name="busca"
          value={termo}
          onChange={(evento) => digitar(evento.target.value)}
          maxLength={80}
          aria-label="Buscar lead por nome, telefone, e-mail, origem ou campanha"
          placeholder="Buscar nome, telefone, e-mail ou campanha"
          className={classeDeEntrada({ recuo: "busca" })}
        />

        {pendente ? (
          <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5 rounded-[var(--radius-controle)] bg-surface px-2 py-1 text-[0.65rem] font-medium text-outline">
            <LoaderCircle aria-hidden="true" size={13} className="animate-spin" />
            buscando
          </span>
        ) : termo ? (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              navegar("", etapa);
            }}
            aria-label="Limpar busca de leads"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] hover:bg-selecao hover:text-primary active:scale-95"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span aria-live="polite" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 text-xs text-outline tabular">
          <UsersRound aria-hidden="true" size={13} className="text-primary" />
          {total === 1 ? "1 lead" : `${total} leads`}
        </span>

        <label htmlFor="filtro-etapa-lead" className="inline-flex items-center gap-1.5 text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase">
          <SlidersHorizontal aria-hidden="true" size={13} />
          Etapa
        </label>
        <select
          id="filtro-etapa-lead"
          name="etapa"
          value={etapa}
          onChange={(evento) => navegar(termo, evento.target.value as FiltroEtapaLead)}
          className={classeDeEntrada({ altura: "compacta", largura: "auto", texto: "xs" })}
        >
          <option value="todos">Todas as etapas</option>
          {ETAPAS_FUNIL.map((item) => (
            <option key={item} value={item}>{ROTULO_ETAPA[item]}</option>
          ))}
        </select>
      </div>
    </form>
  );
}
