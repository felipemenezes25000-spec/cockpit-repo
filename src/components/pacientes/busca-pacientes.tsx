"use client";

import { LoaderCircle, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import { classeDaOpcao, SEGMENTO_GRUPO } from "@/components/ui/segmento";
import type { FiltroSituacao } from "@/server/consultas/pacientes";

const FILTROS: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: "ativas", rotulo: "Ativas" },
  { valor: "arquivadas", rotulo: "Arquivadas" },
  { valor: "todas", rotulo: "Todas" },
];

export function BuscaPacientes({
  busca,
  situacao,
  total,
}: {
  busca: string;
  situacao: FiltroSituacao;
  total: number;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [termo, setTermo] = useState(busca);
  const [enviada, setEnviada] = useState(busca);
  const [buscaAnterior, setBuscaAnterior] = useState(busca);

  if (busca !== buscaAnterior) {
    setBuscaAnterior(busca);
    if (busca !== enviada) {
      setTermo(busca);
      setEnviada(busca);
    }
  }

  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelarEspera() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  useEffect(() => {
    const espera = relogio;
    return () => {
      if (espera.current) clearTimeout(espera.current);
    };
  }, []);

  function navegar(novoTermo: string, novaSituacao: FiltroSituacao) {
    cancelarEspera();
    const query = new URLSearchParams(parametros?.toString() ?? "");
    const limpo = novoTermo.trim();

    if (limpo) query.set("busca", limpo);
    else query.delete("busca");

    if (novaSituacao !== "ativas") query.set("situacao", novaSituacao);
    else query.delete("situacao");

    query.delete("pagina");
    setEnviada(limpo);
    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/pacientes?${texto}` : "/pacientes"));
  }

  function digitar(valor: string) {
    setTermo(valor);
    cancelarEspera();
    if (valor.trim() === enviada) return;
    relogio.current = setTimeout(() => navegar(valor, situacao), 350);
  }

  return (
    <form
      method="get"
      action="/pacientes"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(termo, situacao);
      }}
      className="relative min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface-container-low p-4 sm:p-5"
    >
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="rotulo text-primary">Localizar paciente</p>
          <p className="mt-1 max-w-2xl break-words text-xs leading-5 text-outline">Pesquise por identificação ou contato e refine pela situação do cadastro.</p>
        </div>
        <span aria-live="polite" className="tabular inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface-variant shadow-[0_6px_14px_-12px_rgba(7,57,112,.45)]">
          <Users aria-hidden="true" size={13} strokeWidth={1.75} className="shrink-0 text-primary" />
          <span className="min-w-0 break-words">{total === 1 ? "1 paciente" : `${total} pacientes`}</span>
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full min-w-0 lg:max-w-xl">
          <label htmlFor="busca-paciente" className="mb-1.5 block break-words text-[0.72rem] font-semibold text-on-surface-variant">Nome, telefone, e-mail ou CPF</label>
          <div className="relative min-w-0">
            <Search aria-hidden="true" size={18} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-primary" />
            <input
              id="busca-paciente"
              type="search"
              name="busca"
              value={termo}
              onChange={(evento) => digitar(evento.target.value)}
              maxLength={80}
              aria-label="Buscar paciente por nome, telefone, e-mail ou CPF"
              placeholder="Digite para localizar uma paciente"
              className={`${classeDeEntrada({ recuo: "busca" })} bg-surface shadow-[0_8px_20px_-18px_rgba(7,57,112,.45)]`}
            />

            {pendente ? (
              <span role="status" className="pointer-events-none absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] bg-surface text-primary shadow-[0_6px_14px_-12px_rgba(7,57,112,.4)]">
                <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
                <span className="sr-only">Buscando pacientes…</span>
              </span>
            ) : termo ? (
              <button
                type="button"
                onClick={() => {
                  setTermo("");
                  navegar("", situacao);
                }}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-95"
              >
                <X aria-hidden="true" size={16} strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-end gap-2.5">
          <div className="min-w-0 max-w-full">
            <div className="mb-1.5 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.06em] text-outline uppercase">
              <SlidersHorizontal aria-hidden="true" size={13} className="shrink-0 text-primary" />
              Situação
            </div>

            <div role="group" aria-label="Filtrar por situação" className={`${SEGMENTO_GRUPO} bg-surface shadow-[0_8px_20px_-18px_rgba(7,57,112,.45)]`}>
              {FILTROS.map((filtro) => {
                const ativo = filtro.valor === situacao;
                return (
                  <label key={filtro.valor} className={classeDaOpcao(ativo)}>
                    <input
                      type="radio"
                      name="situacao"
                      value={filtro.valor}
                      checked={ativo}
                      onChange={() => navegar(termo, filtro.valor)}
                      className="sr-only"
                    />
                    {filtro.rotulo}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
