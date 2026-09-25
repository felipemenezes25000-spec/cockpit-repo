"use client";

import { ArrowRight, CalendarCheck, CheckCircle2, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ROTULO_ETAPA, type EtapaLead } from "@/lib/captacao";
import { FAIXAS, QUALIDADES, pctY, proximaQualidade, type QualidadeDoFunil } from "@/lib/funil-3d";
import type { EtapaDoPainel } from "@/server/consultas/captacao";
import { CenaFunil3d } from "./funil-3d-cena";
import estilos from "./funil-vivo.module.css";

const ICONE = {
  novo: UsersRound,
  qualificado: Sparkles,
  agendamento: CalendarCheck,
  ganho: CheckCircle2,
} as const;

function numero(valor: number): string {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function conversao(valor: number | null): string {
  return valor === null ? "—" : `${valor.toLocaleString("pt-BR")}%`;
}

const CONSULTA_MOVIMENTO = "(prefers-reduced-motion: reduce)";

function assinarMovimento(avisar: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const midia = window.matchMedia(CONSULTA_MOVIMENTO);
  midia.addEventListener("change", avisar);
  return () => midia.removeEventListener("change", avisar);
}

function pedeMenosMovimento(): boolean {
  return typeof window.matchMedia !== "function" || window.matchMedia(CONSULTA_MOVIMENTO).matches;
}

/**
 * No servidor e na hidratação o funil nasce parado (mesmo HTML dos dois
 * lados); no navegador ele ganha movimento — a não ser que a pessoa tenha
 * pedido menos movimento no sistema.
 */
function useAnimar(): boolean {
  return !useSyncExternalStore(assinarMovimento, pedeMenosMovimento, () => true);
}

const nadaAssinar = () => () => {};

/** A qualidade que este navegador já provou aguentar (preferência local, por aparelho). */
const CHAVE_QUALIDADE = "cockpit.funil.qualidade";

function qualidadeGuardada(): QualidadeDoFunil {
  if (typeof window === "undefined") return "leve";
  try {
    const valor = window.localStorage.getItem(CHAVE_QUALIDADE);
    return (QUALIDADES as readonly string[]).includes(valor ?? "") ? (valor as QualidadeDoFunil) : "leve";
  } catch {
    return "leve";
  }
}

function guardarQualidade(qualidade: QualidadeDoFunil) {
  try {
    window.localStorage.setItem(CHAVE_QUALIDADE, qualidade);
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): mede de novo na próxima visita.
  }
}

/**
 * O desenho (centenas de nós SVG) só monta no navegador, logo depois da
 * hidratação: no servidor vão os botões, os rótulos, os balões e o painel.
 * Hidratar o SVG junto atrasava a página em ~270 ms no `next dev` — o
 * bastante para o print do `telas.spec` pegar a página antes do React. As
 * faixas entram em cascata ao montar, então o aparecimento é intencional.
 */
function useMontado(): boolean {
  return useSyncExternalStore(nadaAssinar, () => true, () => false);
}

export function FunilVivo({ etapas }: { etapas: EtapaDoPainel[] }) {
  const [ativa, setAtiva] = useState<EtapaLead>("novo");
  const [sobre, setSobre] = useState<number | null>(null);
  const [toques, setToques] = useState(0);
  const parametros = useSearchParams();
  const querAnimar = useAnimar();
  const montado = useMontado();
  const [qualidade, setQualidade] = useState<QualidadeDoFunil>(qualidadeGuardada);
  const medicoes = useRef(0);
  const animar = querAnimar && qualidade !== "parada";
  const svgRef = useRef<SVGSVGElement>(null);
  const selecionada = useMemo(
    () => etapas.find((etapa) => etapa.etapa === ativa) ?? etapas[0],
    [ativa, etapas],
  );
  const indiceSelecionado = Math.max(0, etapas.findIndex((etapa) => etapa.etapa === selecionada?.etapa));
  const temFluxo = (etapas[0]?.volume ?? 0) > 0;

  // Fora da tela, o desenho para (economiza bateria); volta ao aparecer.
  // Na tela, mede 1,2 s de quadros (no máximo duas vezes por visita) e ajusta
  // a qualidade — e guarda a decisão para as próximas páginas. A captura do
  // vídeo congela quadros com `data-congelado="sim"` e não é medida.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !animar || !montado || typeof IntersectionObserver === "undefined") return;
    let quadro = 0;
    let medindo = false;
    const medir = () => {
      if (medindo || medicoes.current >= 2 || svg.dataset.congelado === "sim") return;
      medindo = true;
      medicoes.current += 1;
      let contados = 0;
      const inicio = performance.now();
      const passo = (agora: number) => {
        contados += 1;
        if (agora - inicio < 1200) {
          quadro = requestAnimationFrame(passo);
          return;
        }
        if (svg.dataset.congelado === "sim") return;
        const fps = (contados * 1000) / (agora - inicio);
        setQualidade((atual) => {
          const nova = proximaQualidade(atual, fps);
          guardarQualidade(nova);
          return nova;
        });
      };
      quadro = requestAnimationFrame(passo);
    };
    const observador = new IntersectionObserver(([registro]) => {
      if (svg.dataset.congelado === "sim") return;
      if (registro?.isIntersecting) {
        svg.unpauseAnimations();
        medir();
      } else {
        svg.pauseAnimations();
      }
    });
    observador.observe(svg);
    return () => {
      observador.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [animar, montado, qualidade]);

  if (etapas.length === 0) return null;

  function hrefDaEtapa(etapa: string): string {
    const query = new URLSearchParams(parametros?.toString() ?? "");
    query.set("etapa", etapa);
    query.delete("pagina");
    const texto = query.toString();
    return texto ? `/captacao?${texto}` : "/captacao";
  }

  return (
    <section className={`cabine ${estilos.secao} relative min-h-[34rem] overflow-hidden p-4 sm:p-6`} aria-labelledby="titulo-funil">
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="rotulo">Funil de captação e vendas</p>
          <h2 id="titulo-funil" className="mt-2 text-xl font-semibold tracking-[-0.025em] text-cabine-texto sm:text-2xl">
            Da atenção até a venda
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-cabine-texto-secundario">
            Toque em cada etapa para ver volume, conversão e o esforço que ainda falta para a meta.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-[var(--radius-controle)] border border-cabine-linha px-3 py-2 text-xs font-semibold text-cabine-texto-secundario">
          <span className={temFluxo ? "now-pulse size-2 rounded-full bg-cabine-texto" : "size-2 rounded-full border border-cabine-texto-secundario"} />
          {temFluxo ? "fluxo do período" : "aguardando entradas"}
        </span>
      </div>

      <div className={`${estilos.cena} relative z-10`}>
        <div className={estilos.palco}>
          <div className={estilos.desenho}>
            {montado ? (
              <CenaFunil3d
                svgRef={svgRef}
                selecionada={indiceSelecionado}
                destaque={sobre}
                animar={animar}
                leve={qualidade === "leve"}
                fluxo={temFluxo}
                toques={toques}
              />
            ) : null}
          </div>
          {etapas.slice(0, FAIXAS.length).map((etapa, indice) => {
            const faixa = FAIXAS[indice];
            const altura = faixa.toqueBase - faixa.toqueTopo;
            const Icone = ICONE[etapa.etapa];
            const atual = selecionada?.etapa === etapa.etapa;
            const meio = { top: `${((faixa.centroY - faixa.toqueTopo) / altura) * 100}%` } satisfies CSSProperties;
            // Entrada em cascata de baixo para cima, como as faixas do desenho (CSS).
            const atraso = { "--atraso": `${0.25 + (FAIXAS.length - 1 - indice) * 0.12}s` } as CSSProperties;
            return (
              <button
                key={etapa.etapa}
                type="button"
                className={estilos.faixa}
                style={{ top: pctY(faixa.toqueTopo), height: pctY(altura), ...atraso }}
                onClick={() => {
                  if (etapa.etapa !== ativa) setToques((n) => n + 1);
                  setAtiva(etapa.etapa);
                }}
                onMouseEnter={() => setSobre(indice)}
                onMouseLeave={() => setSobre((s) => (s === indice ? null : s))}
                onFocus={() => setSobre(indice)}
                onBlur={() => setSobre((s) => (s === indice ? null : s))}
                aria-pressed={atual}
                aria-label={`${ROTULO_ETAPA[etapa.etapa]}: ${numero(etapa.volume)}`}
              >
                <span className={estilos.rotuloFaixa} style={meio}>
                  <span className={estilos.iconeFaixa}>
                    <Icone aria-hidden="true" size={18} strokeWidth={1.9} />
                  </span>
                  <span className={estilos.textoFaixa}>
                    <span className={estilos.nomeFaixa}>{ROTULO_ETAPA[etapa.etapa]}</span>
                    <span className={estilos.numeroFaixa}>{numero(etapa.volume)}</span>
                  </span>
                </span>
                <span className={estilos.balao} style={meio}>
                  <span className={estilos.balaoNome}>{ROTULO_ETAPA[etapa.etapa]}</span>
                  <span>
                    Volume: <strong>{numero(etapa.volume)}</strong>
                  </span>
                  <span>
                    Conversão: <strong>{conversao(etapa.conversao)}</strong>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {selecionada ? (
          <aside className={estilos.detalhe} aria-label="Etapa selecionada">
            <div>
              <p className="rotulo">Etapa selecionada</p>
              <p className="mt-1.5 text-base font-semibold text-cabine-texto">{ROTULO_ETAPA[selecionada.etapa]}</p>
              <p className="mt-2 flex items-baseline gap-2 text-cabine-texto">
                <span className="text-3xl font-semibold tracking-[-0.04em] tabular-nums">{numero(selecionada.volume)}</span>
                <span className="text-xs leading-4 text-cabine-texto-secundario">leads da coorte que chegaram a esta etapa</span>
              </p>
            </div>
            <div className={estilos.detalheNumeros}>
              <div>
                <span className="block text-xs text-cabine-texto-secundario">Conversão da etapa</span>
                <strong className="mt-1 block text-xl font-semibold tabular-nums text-cabine-texto">{conversao(selecionada.conversao)}</strong>
              </div>
              <div>
                <span className="block text-xs text-cabine-texto-secundario">Necessário a partir de agora</span>
                <strong className="mt-1 block text-xl font-semibold tabular-nums text-cabine-texto">+{numero(selecionada.necessarioAgora)}</strong>
                <span className="mt-0.5 block text-[0.7rem] leading-4 text-cabine-texto-secundario">para alimentar o restante da meta com as premissas atuais.</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={hrefDaEtapa(selecionada.etapa)}
                className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius-controle)] border border-cabine-linha bg-white/12 px-3 text-xs font-semibold text-cabine-texto transition-[transform,background-color] hover:bg-white/20 active:scale-[0.985]"
              >
                Ver quem está nesta etapa agora
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
              <p className="text-[0.68rem] leading-4 text-cabine-texto-secundario">
                A carteira filtra pelo estágio atual; o volume acima mede quem chegou à etapa no período.
              </p>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
