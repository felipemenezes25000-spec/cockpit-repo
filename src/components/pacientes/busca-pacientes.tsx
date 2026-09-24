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
      className="premium-panel relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-painel)] border p-3.5 lg:flex-row lg:items-center lg:justify-between"
    >

      <div className="relative w-full lg:max-w-md">
        <Search aria-hidden="true" size={18} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline" />
        <input
          type="search"
          name="busca"
          value={termo}
          onChange={(evento) => digitar(evento.target.value)}
          maxLength={80}
          aria-label="Buscar paciente por nome, telefone, e-mail ou CPF"
          placeholder="Buscar por nome, telefone, e-mail ou CPF"
          className={`${classeDeEntrada({ recuo: "busca" })} bg-surface`}
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
              navegar("", situacao);
            }}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-95"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-live="polite" className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap text-outline tabular">
          <Users aria-hidden="true" size={13} strokeWidth={1.65} className="text-primary" />
          {total === 1 ? "1 paciente" : `${total} pacientes`}
        </span>

        <div className="inline-flex items-center gap-1.5 text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase">
          <SlidersHorizontal aria-hidden="true" size={13} />
          Situação
        </div>

        <div role="group" aria-label="Filtrar por situação" className={`${SEGMENTO_GRUPO} bg-surface`}>
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
    </form>
  );
}
