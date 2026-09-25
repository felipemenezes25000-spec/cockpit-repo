"use client";

import { Check, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Campo, classeDeEntrada, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  buscarPacientesParaSelecao,
  type PacienteParaSelecao,
} from "@/server/acoes/agenda";

export function SeletorPaciente({
  inicial,
  erro,
  obrigatorio = true,
  aoEscolher,
  idPrefix = "busca-paciente",
}: {
  inicial: PacienteParaSelecao | null;
  erro?: string;
  obrigatorio?: boolean;
  aoEscolher?: (paciente: PacienteParaSelecao | null) => void;
  /**
   * Identificador visual/acessível do controle. O nome enviado ao formulário
   * continua sendo `paciente_id`; o prefixo só evita ids HTML repetidos quando
   * uma tela tem mais de um seletor, como a carteira de Captação.
   */
  idPrefix?: string;
}) {
  const [escolhida, setEscolhida] = useState<PacienteParaSelecao | null>(inicial);
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<PacienteParaSelecao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [falhouBusca, setFalhouBusca] = useState(false);
  const [destacada, setDestacada] = useState(-1);
  const [listaFechada, setListaFechada] = useState(false);
  const idLista = useId();
  const ultimaBusca = useRef(0);
  const campo = useRef<HTMLInputElement>(null);
  const oculto = useRef<HTMLInputElement>(null);
  const trocar = useRef<HTMLButtonElement>(null);
  const idErro = `${idPrefix}-erro`;

  const listaAberta = opcoes.length > 0 && !listaFechada;

  /**
   * Leva o foco a `alvo` no próximo quadro — só se ninguém o levou para outro
   * lugar nesse meio-tempo. O quadro atrasa quando a tela está ocupada (as
   * animações de entrada), e quem já tinha clicado no campo seguinte e
   * começado a digitar perdia o texto: o foco pulava para o "Trocar" no meio
   * da digitação. Foco solto (no body) ou ainda aqui dentro: pode levar.
   */
  function focarDepois(alvo: RefObject<HTMLElement | null>) {
    requestAnimationFrame(() => {
      const ativo = document.activeElement;
      const caixa = oculto.current?.parentElement;
      if (!ativo || ativo === document.body || caixa?.contains(ativo)) alvo.current?.focus();
    });
  }

  function escolher(opcao: PacienteParaSelecao) {
    setEscolhida(opcao);
    setOpcoes([]);
    setDestacada(-1);
    aoEscolher?.(opcao);
    focarDepois(trocar);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && opcoes.length > 0) {
      evento.preventDefault();
      setListaFechada(false);
      setDestacada((atual) => (atual + 1) % opcoes.length);
    } else if (evento.key === "ArrowUp" && opcoes.length > 0) {
      evento.preventDefault();
      setListaFechada(false);
      setDestacada((atual) => (atual <= 0 ? opcoes.length - 1 : atual - 1));
    } else if (evento.key === "Enter" && listaAberta && destacada >= 0) {
      evento.preventDefault();
      escolher(opcoes[destacada]);
    } else if (evento.key === "Escape" && listaAberta) {
      evento.preventDefault();
      setListaFechada(true);
      setDestacada(-1);
    }
  }

  useEffect(() => {
    const digitado = campo.current?.value ?? "";
    if (digitado) setTermo(digitado);
  }, []);

  useEffect(() => {
    const formulario = oculto.current?.form;
    if (!formulario) return;
    // O React 19 reinicia o formulário depois de TODA ação, inclusive a que
    // o servidor recusou ("Informe o valor original."). A paciente escolhida
    // é dado da pessoa, como o texto de um campo: sobrevive ao reset, senão o
    // segundo envio volta com "Escolha a paciente". O reset só limpa a busca
    // em andamento.
    function aoResetar() {
      setTermo("");
      setOpcoes([]);
      setDestacada(-1);
      setListaFechada(false);
    }
    formulario.addEventListener("reset", aoResetar);
    return () => formulario.removeEventListener("reset", aoResetar);
  }, []);

  useEffect(() => {
    if (escolhida || termo.trim().length < 2) {
      setOpcoes([]);
      setBuscando(false);
      setFalhouBusca(false);
      return;
    }

    setBuscando(true);
    setListaFechada(false);
    setDestacada(-1);
    const numero = ++ultimaBusca.current;
    const relogio = setTimeout(async () => {
      try {
        const achadas = await buscarPacientesParaSelecao(termo);
        if (numero === ultimaBusca.current) {
          setOpcoes(achadas);
          setFalhouBusca(false);
        }
      } catch {
        if (numero === ultimaBusca.current) {
          setOpcoes([]);
          setFalhouBusca(true);
        }
      } finally {
        if (numero === ultimaBusca.current) setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(relogio);
  }, [termo, escolhida]);

  return (
    <Campo id={idPrefix} rotulo="Paciente" obrigatorio={obrigatorio} erro={erro}>
      <input ref={oculto} type="hidden" name="paciente_id" value={escolhida?.id ?? ""} />

      {escolhida ? (
        <div className="premium-interactive group relative isolate flex items-center justify-between gap-3 overflow-hidden rounded-[var(--radius-painel)] border border-positivo-borda bg-positivo-fundo px-3.5 py-3">
          <span className="flex min-w-0 items-center gap-3 text-sm text-on-surface">
            <span className="relative shrink-0">
              <Avatar nome={escolhida.nome} tamanho="sm" />
              <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-surface bg-positivo text-on-primary">
                <Check aria-hidden="true" size={9} strokeWidth={2.4} />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold tracking-[-0.01em]">{escolhida.nome}</span>
              <span className="mt-0.5 block truncate text-xs text-outline">{escolhida.detalhe}</span>
              <span className="mt-1.5 inline-flex rounded-full border border-positivo-borda bg-surface px-2 py-0.5 text-[0.62rem] font-semibold text-positivo">Paciente selecionada</span>
            </span>
          </span>
          <button
            ref={trocar}
            type="button"
            onClick={() => {
              setEscolhida(null);
              setTermo("");
              aoEscolher?.(null);
              focarDepois(campo);
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline transition-[transform,background-color,color,border-color] duration-150 hover:border-primary-fixed-dim hover:bg-selecao hover:text-primary active:scale-95"
            aria-label={`Trocar a paciente (${escolhida.nome})`}
          >
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search aria-hidden="true" size={16} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-outline transition-colors" />
          <input
            ref={campo}
            id={idPrefix}
            type="text"
            role="combobox"
            aria-expanded={listaAberta}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={listaAberta && destacada >= 0 ? `${idLista}-${destacada}` : undefined}
            autoComplete="off"
            defaultValue=""
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={aoTeclar}
            onBlur={() => {
              setListaFechada(true);
              setDestacada(-1);
            }}
            onFocus={() => setListaFechada(false)}
            aria-describedby={erro ? idErro : undefined}
            placeholder="Buscar por nome, telefone ou CPF"
            className={cn(classeDeEntrada({ recuo: "icone" }), erro && ENTRADA_ERRO)}
            {...(erro ? { "aria-invalid": true as const } : {})}
          />
          {buscando ? <LoaderCircle aria-hidden="true" size={16} className="absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-primary" /> : null}

          {listaAberta ? (
            <div className="glass-surface page-reveal absolute z-30 mt-2 w-full overflow-hidden rounded-[var(--radius-painel)] border border-card-border shadow-flutuante">
              <div className="flex items-center justify-between gap-3 border-b border-card-border bg-surface px-3.5 py-2 text-[0.65rem] text-outline">
                <span>{opcoes.length === 1 ? "1 paciente encontrada" : `${opcoes.length} pacientes encontradas`}</span>
                <span className="hidden sm:inline">↑ ↓ escolher · Enter confirmar</span>
              </div>
              <ul id={idLista} role="listbox" aria-label="Pacientes encontradas" className="rolagem-discreta rolagem-esmaecida max-h-80 overflow-y-auto p-1.5">
                {opcoes.map((opcao, indice) => (
                  <li
                    key={opcao.id}
                    id={`${idLista}-${indice}`}
                    role="option"
                    aria-selected={indice === destacada}
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      escolher(opcao);
                    }}
                    onMouseEnter={() => setDestacada(indice)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-[var(--radius-cartao)] border px-3 py-2.5 text-left transition-[transform,background-color,border-color] duration-150",
                      indice === destacada
                        ? "border-primary-fixed bg-selecao"
                        : "border-transparent hover:bg-surface-container-low",
                    )}
                  >
                    <Avatar nome={opcao.nome} tamanho="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-on-surface">{opcao.nome}</span>
                      <span className="mt-0.5 block truncate text-xs text-outline">{opcao.detalhe}</span>
                    </span>
                    {indice === destacada ? <Check aria-hidden="true" size={16} strokeWidth={1.9} className="shrink-0 text-primary" /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!buscando && falhouBusca ? (
            <p role="alert" className="mt-1.5 text-xs text-negativo">Não foi possível buscar agora. Confira a conexão e digite de novo.</p>
          ) : null}

          <div role="status">
            {buscando ? <span className="sr-only">Buscando…</span> : null}
            {!buscando && listaAberta ? (
              <span className="sr-only">
                {opcoes.length === 1 ? "1 paciente encontrada. Use as setas para escolher." : `${opcoes.length} pacientes encontradas. Use as setas para escolher.`}
              </span>
            ) : null}
            {!buscando && !falhouBusca && termo.trim().length >= 2 && opcoes.length === 0 ? (
              <p className="mt-1.5 text-xs text-outline">
                Nenhuma paciente encontrada. Confira a escrita ou{" "}
                <Link href="/pacientes/novo" className="font-medium text-primary underline underline-offset-2">cadastre primeiro</Link>.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </Campo>
  );
}
