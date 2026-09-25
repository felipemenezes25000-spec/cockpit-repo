"use client";

import { Info, LoaderCircle, Search, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import {
  ETAPAS_FUNIL,
  FILTROS_ATENCAO,
  lerFiltroAtencao,
  ORIGENS_CAPTACAO,
  recorteDeRetorno,
  ROTULO_ATENCAO,
  ROTULO_ETAPA,
  type FiltroAtencaoLead,
} from "@/lib/captacao";
import type { FiltroEtapaLead } from "@/server/consultas/captacao-leads";

type EstadoFiltros = {
  termo: string;
  etapa: FiltroEtapaLead;
  origem: string;
  campanha: string;
  atencao: FiltroAtencaoLead;
};

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
  const origem = parametros?.get("origem")?.slice(0, 60) ?? "";
  const campanha = parametros?.get("campanha")?.slice(0, 120) ?? "";
  const atencao = lerFiltroAtencao(parametros?.get("atencao"));
  const [pendente, iniciar] = useTransition();
  const [termo, setTermo] = useState(busca);
  const [enviado, setEnviado] = useState(busca);
  const [buscaAnterior, setBuscaAnterior] = useState(busca);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (busca !== buscaAnterior) {
    setBuscaAnterior(busca);
    if (busca !== enviado) {
      setTermo(busca);
      setEnviado(busca);
    }
  }

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

  function navegar(novos: EstadoFiltros) {
    cancelarEspera();
    const query = new URLSearchParams(parametros?.toString() ?? "");
    const limpo = novos.termo.trim();

    if (limpo) query.set("busca", limpo);
    else query.delete("busca");

    if (novos.etapa !== "todos") query.set("etapa", novos.etapa);
    else query.delete("etapa");

    if (novos.origem) query.set("origem", novos.origem);
    else query.delete("origem");

    if (novos.campanha) query.set("campanha", novos.campanha);
    else query.delete("campanha");

    if (novos.atencao !== "todos") query.set("atencao", novos.atencao);
    else query.delete("atencao");

    query.delete("pagina");
    setEnviado(limpo);
    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/captacao?${texto}` : "/captacao"));
  }

  const atuais = (novoTermo = termo): EstadoFiltros => ({
    termo: novoTermo,
    etapa,
    origem,
    campanha,
    atencao,
  });

  function digitar(valor: string) {
    setTermo(valor);
    cancelarEspera();
    if (valor.trim() === enviado) return;
    relogio.current = setTimeout(() => navegar(atuais(valor)), 350);
  }

  const temFiltroEstruturado = etapa !== "todos" || Boolean(origem) || Boolean(campanha) || atencao !== "todos";

  return (
    <form
      method="get"
      action="/captacao"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(atuais());
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low p-3.5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                navegar(atuais(""));
              }}
              aria-label="Limpar busca de leads"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] hover:bg-selecao hover:text-primary active:scale-95"
            >
              <X aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        <span aria-live="polite" className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 text-xs text-outline tabular">
          <UsersRound aria-hidden="true" size={13} className="text-primary" />
          {total === 1 ? "1 lead no recorte" : `${total} leads no recorte`}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-card-border pt-3 sm:flex-row sm:flex-wrap sm:items-end">
        <span className="mb-1 inline-flex items-center gap-1.5 text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase sm:mr-1 sm:h-9 sm:items-center">
          <SlidersHorizontal aria-hidden="true" size={13} />
          Filtros
        </span>

        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-40 sm:max-w-52">
          <span className="text-[0.62rem] font-semibold tracking-[0.055em] text-outline uppercase">Etapa</span>
          <select
            name="etapa"
            value={etapa}
            onChange={(evento) => navegar({ ...atuais(), etapa: evento.target.value as FiltroEtapaLead })}
            className={classeDeEntrada({ altura: "compacta", texto: "xs" })}
          >
            <option value="todos">Todas as etapas</option>
            {ETAPAS_FUNIL.map((item) => (
              <option key={item} value={item}>{ROTULO_ETAPA[item]}</option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-40 sm:max-w-52">
          <span className="text-[0.62rem] font-semibold tracking-[0.055em] text-outline uppercase">Origem</span>
          <select
            name="origem"
            value={origem}
            onChange={(evento) => navegar({ ...atuais(), origem: evento.target.value })}
            className={classeDeEntrada({ altura: "compacta", texto: "xs" })}
          >
            <option value="">Todas as origens</option>
            {ORIGENS_CAPTACAO.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-40 sm:max-w-52">
          <span className="text-[0.62rem] font-semibold tracking-[0.055em] text-outline uppercase">Acompanhamento</span>
          <select
            name="atencao"
            value={atencao}
            onChange={(evento) => navegar({ ...atuais(), atencao: lerFiltroAtencao(evento.target.value) })}
            className={classeDeEntrada({ altura: "compacta", texto: "xs" })}
          >
            {FILTROS_ATENCAO.map((item) => (
              <option key={item} value={item}>{ROTULO_ATENCAO[item]}</option>
            ))}
          </select>
        </label>

        {campanha ? (
          <button
            type="button"
            onClick={() => navegar({ ...atuais(), campanha: "" })}
            title={campanha}
            className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border border-primary-fixed bg-selecao px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed"
          >
            <span className="max-w-52 truncate">Campanha: {campanha}</span>
            <X aria-hidden="true" size={13} className="shrink-0" />
          </button>
        ) : null}

        {temFiltroEstruturado ? (
          <button
            type="button"
            onClick={() => navegar({ termo, etapa: "todos", origem: "", campanha: "", atencao: "todos" })}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-primary transition-colors hover:bg-selecao"
          >
            <X aria-hidden="true" size={14} />
            Limpar filtros
          </button>
        ) : null}
      </div>

      {recorteDeRetorno(atencao) ? (
        <p className="flex items-start gap-2 border-t border-card-border pt-3 text-xs leading-5 text-on-surface-variant">
          <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-primary" />
          Retornos valem para toda a carteira aberta: aparecem aqui os leads de qualquer mês de entrada, não só os que entraram no período selecionado.
        </p>
      ) : null}
    </form>
  );
}
